CREATE TABLE `pos_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`description` varchar(180) NOT NULL,
	`category` varchar(80) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`status` enum('Pending','Approved') NOT NULL DEFAULT 'Pending',
	`expenseDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_online_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`orderNumber` varchar(48) NOT NULL,
	`buyerName` varchar(160) NOT NULL,
	`itemCount` int NOT NULL DEFAULT 1,
	`total` decimal(12,2) NOT NULL,
	`fulfilmentMethod` enum('Delivery','Pickup') NOT NULL DEFAULT 'Pickup',
	`status` enum('New','Ready','Dispatched','Cancelled') NOT NULL DEFAULT 'New',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_online_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`category` varchar(80) NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`purchaseNumber` varchar(48) NOT NULL,
	`supplierName` varchar(160) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`deliveryStatus` enum('Receiving','Delivered','In transit') NOT NULL DEFAULT 'Receiving',
	`paymentStatus` enum('Open','Paid') NOT NULL DEFAULT 'Open',
	`orderedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`receiptNumber` varchar(48) NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`channel` enum('Retail','Online') NOT NULL DEFAULT 'Retail',
	`amount` decimal(12,2) NOT NULL,
	`status` enum('Pending','Paid','Refunded') NOT NULL DEFAULT 'Paid',
	`itemsJson` text,
	`soldAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_staff_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` varchar(100) NOT NULL,
	`location` varchar(100) NOT NULL,
	`status` enum('Active','Invited','Inactive') NOT NULL DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_staff_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
