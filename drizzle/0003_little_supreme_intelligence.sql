ALTER TABLE `pos_expenses` ADD `locationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pos_online_orders` ADD `locationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pos_payments` ADD `locationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pos_purchases` ADD `locationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pos_sales` ADD `locationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pos_staff_members` ADD `locationId` int NOT NULL;