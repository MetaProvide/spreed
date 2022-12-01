# Makefile for building the project

app_name=spreed
app_id=spreed
build_directory=$(CURDIR)/build
temp_build_directory=$(build_directory)/temp
build_tools_directory=$(CURDIR)/build/tools

all: dev-setup lint build-js-production

release: npm-init build-js-production build-tarball
# Dev env management
dev-setup: clean clean-dev composer npm-init

lint: eslint stylelint php-cs

lint-fix: eslint-fix stylelint-fix php-cs-fix

# Dependencies
composer:
	composer install --prefer-dist

composer-update:
	composer update --prefer-dist

npm-init:
	npm ci --force

npm-update:
	npm update

# Building
build-js:
	npm run dev

build-js-production:
	npm run build

watch-js:
	npm run watch

serve-js:
	npm run serve

# Linting
eslint:
	npm run eslint

eslint-fix:
	npm run eslint:fix

# Style linting
stylelint:
	npm run stylelint

stylelint-fix:
	npm run stylelint:fix

# PHP CS Fixer
php-cs:
	vendor/bin/php-cs-fixer fix -v --dry-run

php-cs-fix:
	vendor/bin/php-cs-fixer fix -v

# Cleaning
clean:
	rm -rf js/*

clean-dev:
	rm -rf node_modules

build-tarball:
	rm -rf $(build_directory)
	mkdir -p $(temp_build_directory)
	rsync -a \
	--exclude=".git" \
	--exclude=".github" \
	--exclude=".tx" \
	--exclude=".vscode" \
	--exclude="build" \
	--exclude="docs" \
	--exclude="node_modules" \
	--exclude="src" \
	--exclude="tests" \
	--exclude="vendor" \
	--exclude=".drone.yml" \
	--exclude=".editorconfig" \
	--exclude=".eslintignore" \
	--exclude=".eslintrc.js" \
	--exclude=".gitattributes" \
	--exclude=".gitignore" \
	--exclude=".l10nignore" \
	--exclude=".php_cs.cache" \
	--exclude=".php-cs-fixer.dist.php" \
	--exclude=".prettierrc" \
	--exclude=".stylelintignore" \
	--exclude=".stylelintrc.json" \
	--exclude="babel.config.js" \
	--exclude="composer.json" \
	--exclude="composer.lock" \
	--exclude="jest.config.js" \
	--exclude="Makefile" \
	--exclude="mkdocs.yml" \
	--exclude="package-lock.json" \
	--exclude="package.json" \
	--exclude="psalm.xml" \
	--exclude="stylelint.config.js" \
	--exclude="webpack.js" \
	../$(app_name)/ $(temp_build_directory)/$(app_id)
	tar czf $(build_directory)/$(app_name).tar.gz \
		-C $(temp_build_directory) $(app_id)
