CREATE TABLE `pos_inventory_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`productId` int NOT NULL,
	`locationId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`reorderLevel` int NOT NULL DEFAULT 15,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_inventory_balances_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_inventory_balances_owner_product_location_unique` UNIQUE(`ownerId`,`productId`,`locationId`)
);
--> statement-breakpoint
CREATE TABLE `pos_product_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_product_categories_owner_name_unique` UNIQUE(`ownerId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `pos_products` ADD `categoryId` int;--> statement-breakpoint
ALTER TABLE `pos_stock_movements` ADD `locationId` int;--> statement-breakpoint
CREATE INDEX `pos_inventory_balances_owner_location_idx` ON `pos_inventory_balances` (`ownerId`,`locationId`);--> statement-breakpoint
CREATE INDEX `pos_product_categories_owner_idx` ON `pos_product_categories` (`ownerId`);