CREATE TABLE `cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`value` decimal(15,2) NOT NULL,
	`flag` enum('Visa','Mastercard','Elo','Hipercard') NOT NULL DEFAULT 'Visa',
	`installments` int NOT NULL DEFAULT 1,
	`creditLimit` decimal(15,2) NOT NULL DEFAULT '0',
	`date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`value` decimal(15,2) NOT NULL,
	`type` enum('Empréstimo','Cartão','Boleto','Pessoa Física','Financiamento','Outros') NOT NULL DEFAULT 'Outros',
	`dueDate` date NOT NULL,
	`paid` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `debts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`value` decimal(15,2) NOT NULL,
	`category` enum('Alimentação','Transporte','Saúde','Lazer','Educação','Casa','Outros') NOT NULL DEFAULT 'Outros',
	`date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`value` decimal(15,2) NOT NULL,
	`date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `incomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`value` decimal(15,2) NOT NULL,
	`description` varchar(255) DEFAULT 'Salário',
	`date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `salaries_id` PRIMARY KEY(`id`)
);
