-- Change category column from ENUM to VARCHAR to support custom categories
ALTER TABLE `expenses` MODIFY COLUMN `category` varchar(100) NOT NULL DEFAULT 'Outros';
