// Определяем переменную "preprocessor"
let preprocessor = 'sass';

// Определяем константы Gulp
const { src, dest, parallel, series, watch } = require('gulp');

// Подключаем Browsersync
const browserSync = require('browser-sync').create();

//Подключаем gulp-pug
const pug = require('gulp-pug');

// Подключаем gulp-concat
const concat = require('gulp-concat');

// Подключаем gulp-uglify-es
const uglify = require('gulp-uglify-es').default;

// Подключаем модули gulp-sass и gulp-less
const sass = require('gulp-sass')(require('sass'));
const less = require('gulp-less');

// Подключаем Autoprefixer
const autoprefixer = require('gulp-autoprefixer');

// Подключаем модуль gulp-clean-css
const cleancss = require('gulp-clean-css');

// Подключаем compress-images для работы с изображениями
const imagecomp = require('compress-images');

// Подключаем модуль del
const del = require('del');

//svg sprite
var svgSprite = require('gulp-svg-sprite');
var svgmin = 		require('gulp-svgmin');
var	cheerio = 	require('gulp-cheerio');
var	replace = 	require('gulp-replace');

//webp
const webp = require('gulp-webp');
const cache = require('gulp-cache');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const jpegrecompress = require('imagemin-jpeg-recompress');


// Модули для Шаблона
const consolidate = require("gulp-consolidate");
const pages = require("./app/template/index.json");

// Определяем логику работы Browsersync
function browsersync() {
	browserSync.init({ // Инициализация Browsersync
		server: { baseDir: 'app/' }, // Указываем папку сервера
		notify: false, // Отключаем уведомления
		online: true // Режим работы: true или false
	})
}

function pugf() {
	return src('app/pug/*.pug')
	.pipe(pug({pretty: true}))
	.pipe(dest('app/'))
	.pipe(browserSync.stream())
}

function scripts() {
	return src([ // Берём файлы из источников
		'node_modules/jquery/dist/jquery.min.js', // Пример подключения библиотеки
		'app/js/app.js', // Пользовательские скрипты, использующие библиотеку, должны быть подключены в конце
		])
	.pipe(concat('app.min.js')) // Конкатенируем в один файл
	.pipe(uglify()) // Сжимаем JavaScript
	.pipe(dest('app/js/')) // Выгружаем готовый файл в папку назначения
	.pipe(browserSync.stream()) // Триггерим Browsersync для обновления страницы
}

function styles() {
	return src(['node_modules/bootstrap/dist/css/bootstrap.min.css',
		'app/' + preprocessor + '/main.' + preprocessor + '']) // Выбираем источник: "app/sass/main.sass" или "app/less/main.less"
	.pipe(eval(preprocessor)()) // Преобразуем значение переменной "preprocessor" в функцию
	.pipe(concat('app.min.css')) // Конкатенируем в файл app.min.js
	.pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true })) // Создадим префиксы с помощью Autoprefixer
	.pipe(cleancss( { level: { 1: { specialComments: 0 } }/* , format: 'beautify' */ } )) // Минифицируем стили
	.pipe(dest('app/css/')) // Выгрузим результат в папку "app/css/"
	.pipe(browserSync.stream()) // Сделаем инъекцию в браузер
}

async function images() {
	imagecomp(
		"app/images/src/**/*", // Берём все изображения из папки источника
		"app/images/dest/", // Выгружаем оптимизированные изображения в папку назначения
		{ compress_force: false, statistic: true, autoupdate: true }, false, // Настраиваем основные параметры
		{ jpg: { engine: "mozjpeg", command: ["-quality", "75"] } }, // Сжимаем и оптимизируем изображеня
		{ png: { engine: "pngquant", command: ["--quality=75-100", "-o"] } },
		{ svg: { engine: "svgo", command: "--multipass" } },
		{ gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
		function (err, completed) { // Обновляем страницу по завершению
			if (completed === true) {
				browserSync.reload()
			}
		}
	)
}

async function webpf() {
  return src(['app/images/src/**/*.*', '!app/images/src/**/*.svg'])
    .pipe(webp())
		.pipe(dest('app/images/dest/')) // Выгружаем готовый файл в папку назначения
		.pipe(browserSync.stream()) // Триггерим Browsersync для обновления страницы
}

function cleanimg() {
	return del('app/images/dest/**/*', { force: true }) // Удаляем всё содержимое папки "app/images/dest/"
}

function svgsprite() {
	return src('app/images/src/icons/*.svg')
	// minify svg
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		// remove all fill, style and stroke declarations in out shapes
		.pipe(cheerio({
			run: function ($) {
				// $('[fill]').removeAttr('fill');
				// $('[stroke]').removeAttr('stroke');
				// $('[style]').removeAttr('style');
			},
			parserOptions: {xmlMode: true}
		}))
		// cheerio plugin create unnecessary string '&gt;', so replace it.
		.pipe(replace('&gt;', '>'))
		// build svg sprite
		.pipe(svgSprite({
			mode: {
				symbol: {
					sprite: "../sprite.svg",
					render: {
						sass: {
							dest:'../../../sass/utils/_sprite.sass',
							template: "app/sass/utils/_sprite_template.sass"
						}
					}
				}
			}
		}))
		.pipe(dest('app/images/dest/'))
}

function buildcopy() {
	return src([ // Выбираем нужные файлы
		'app/css/**/*.min.css',
		'app/js/**/*.min.js',
		'app/images/dest/**/*',
		'app/fonts/**/*',
		'app/php/**/*',
		'app/pdf/**/*',
		'app/**/*.html',
		'app/**/*.ico',
		], { base: 'app' }) // Параметр "base" сохраняет структуру проекта при копировании
	.pipe(dest('dist')) // Выгружаем в папку с финальной сборкой
}

function cleandist() {
	return del('dist/**/*', { force: true }) // Удаляем всё содержимое папки "dist/"
}

function template() {
	return src("./app/template/template.html")
  .pipe(consolidate("lodash", {
      pages: pages
  }))
  .pipe(dest("./app/"))
	.pipe(browserSync.stream());
};

function startwatch() {
	// Мониторим файлы препроцессора Pug на изменения
	watch('app/pug/**/*.pug', pugf);

	// Мониторим файлы иконки на изменения
	watch('app/images/src/icons/*.svg', svgsprite);

	// Выбираем все файлы JS в проекте, а затем исключим с суффиксом .min.js
	watch(['app/**/*.js', '!app/**/*.min.js'], scripts);

	// Мониторим файлы препроцессора на изменения
	watch('app/**/' + preprocessor + '/**/*', styles);

	// Мониторим файлы HTML на изменения
	watch('app/**/*.html').on('change', browserSync.reload);

	// Мониторим файлы PHP на изменения
	watch('app/**/*.php').on('change', browserSync.reload);

	// Мониторим папку-источник изображений и выполняем images(), если есть изменения
	watch('app/images/src/**/*', images);

	// Мониторим папку-источник изображений и выполняем images(), если есть изменения
	watch('app/images/src/**/*', webpf);

}

// Экспортируем функцию browsersync() как таск browsersync. Значение после знака = это имеющаяся функция.
exports.browsersync = browsersync;

// Экспортируем функцию scripts() в таск scripts
exports.scripts = scripts;

// Экспортируем функцию styles() в таск styles
exports.styles = styles;

// Экспорт функции images() в таск images
exports.images = images;

// Экспорт функции webp() в таск webp
exports.webp = webpf;

// Экспорт функции svgSprite() в таск images
exports.svgsprite = svgsprite;

// Экспортируем функцию cleanimg() как таск cleanimg
exports.cleanimg = cleanimg;

exports.template = template;

// Создаём новый таск "build", который последовательно выполняет нужные операции
exports.build = series(cleandist, styles, scripts, webpf, images, template, buildcopy);

// Экспортируем дефолтный таск с нужным набором функций
exports.default = parallel(pugf, svgsprite, webpf, images, styles, scripts, browsersync, startwatch);
