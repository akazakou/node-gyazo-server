ALTER TABLE `images` ADD COLUMN `owner` CHAR(255) NOT NULL AFTER `lifetime`, ADD UNIQUE INDEX `md5_UNIQUE` (`md5` ASC);