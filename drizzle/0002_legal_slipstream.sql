CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`targetAmount` decimal(15,2) NOT NULL,
	`currentAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`category` enum('Viagem','Casa','Carro','Educacao','Saude','Lazer','Outros') NOT NULL DEFAULT 'Outros',
	`dueDate` date,
	`completed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
