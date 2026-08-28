CREATE TABLE `pos_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(320),
	`phone` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(32) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_locations_owner_code_unique` UNIQUE(`ownerId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `pos_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`saleId` int,
	`direction` enum('Received','Sent') NOT NULL,
	`method` enum('Cash','Card','Bank transfer','Other') NOT NULL DEFAULT 'Card',
	`amount` decimal(12,2) NOT NULL,
	`status` enum('Pending','Completed','Voided') NOT NULL DEFAULT 'Completed',
	`reference` varchar(120),
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(160) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`category` varchar(80) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`lineTotal` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`productId` int NOT NULL,
	`quantityDelta` int NOT NULL,
	`reason` enum('Initial','Adjustment','Sale','Return','Purchase','Transfer in','Transfer out') NOT NULL,
	`referenceType` varchar(40),
	`referenceId` int,
	`note` varchar(280),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pos_products` ADD `reorderLevel` int DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `pos_sales` ADD `subtotal` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `pos_sales` ADD `taxAmount` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `pos_online_orders` ADD CONSTRAINT `pos_online_orders_owner_number_unique` UNIQUE(`ownerId`,`orderNumber`);--> statement-breakpoint
ALTER TABLE `pos_products` ADD CONSTRAINT `pos_products_owner_sku_unique` UNIQUE(`ownerId`,`sku`);--> statement-breakpoint
ALTER TABLE `pos_purchases` ADD CONSTRAINT `pos_purchases_owner_number_unique` UNIQUE(`ownerId`,`purchaseNumber`);--> statement-breakpoint
ALTER TABLE `pos_sales` ADD CONSTRAINT `pos_sales_owner_receipt_unique` UNIQUE(`ownerId`,`receiptNumber`);--> statement-breakpoint
CREATE INDEX `pos_customers_owner_name_idx` ON `pos_customers` (`ownerId`,`name`);--> statement-breakpoint
CREATE INDEX `pos_locations_owner_idx` ON `pos_locations` (`ownerId`);--> statement-breakpoint
CREATE INDEX `pos_payments_owner_paid_at_idx` ON `pos_payments` (`ownerId`,`paidAt`);--> statement-breakpoint
CREATE INDEX `pos_sale_items_owner_sale_idx` ON `pos_sale_items` (`ownerId`,`saleId`);--> statement-breakpoint
CREATE INDEX `pos_sale_items_owner_product_idx` ON `pos_sale_items` (`ownerId`,`productId`);--> statement-breakpoint
CREATE INDEX `pos_stock_movements_owner_product_created_idx` ON `pos_stock_movements` (`ownerId`,`productId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pos_expenses_owner_date_idx` ON `pos_expenses` (`ownerId`,`expenseDate`);--> statement-breakpoint
CREATE INDEX `pos_online_orders_owner_updated_idx` ON `pos_online_orders` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `pos_products_owner_idx` ON `pos_products` (`ownerId`);--> statement-breakpoint
CREATE INDEX `pos_purchases_owner_ordered_at_idx` ON `pos_purchases` (`ownerId`,`orderedAt`);--> statement-breakpoint
CREATE INDEX `pos_sales_owner_sold_at_idx` ON `pos_sales` (`ownerId`,`soldAt`);--> statement-breakpoint
CREATE INDEX `pos_staff_members_owner_idx` ON `pos_staff_members` (`ownerId`);