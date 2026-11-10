<?php
return <<<'KEDATA_SCHEMA'
-- Kedata CMS / MySQL, import into a NEW empty database.

SET NAMES utf8mb4;

CREATE TABLE `User` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `email` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `name` LONGTEXT NOT NULL,
  `passwordHash` LONGTEXT NOT NULL,
  `role` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `SiteMembership` (
  `userId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`userId`,`siteId`),
  KEY `siteId_index` (`siteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Session` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `token` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `userId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `expiresAt` VARCHAR(32) NOT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Site` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `name` LONGTEXT NOT NULL,
  `slug` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `domain` LONGTEXT NOT NULL,
  `description` LONGTEXT NULL,
  `apiKeyHash` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `apiKeyPrefix` LONGTEXT NOT NULL,
  `corsOrigins` LONGTEXT NOT NULL,
  `webhookUrl` LONGTEXT NULL,
  `webhookSecret` LONGTEXT NULL,
  `rateLimit` INT NOT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `apiKeyHash` (`apiKeyHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `SiteSetting` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteTitle` LONGTEXT NOT NULL,
  `tagline` LONGTEXT NULL,
  `logoUrl` LONGTEXT NULL,
  `faviconUrl` LONGTEXT NULL,
  `contactEmail` LONGTEXT NULL,
  `contactPhone` LONGTEXT NULL,
  `socialLinks` LONGTEXT NOT NULL,
  `footerText` LONGTEXT NULL,
  `customMetadata` LONGTEXT NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `siteId` (`siteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Category` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `name` LONGTEXT NOT NULL,
  `slug` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `description` LONGTEXT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `siteId_slug` (`siteId`,`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Tag` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `name` LONGTEXT NOT NULL,
  `slug` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `siteId_slug` (`siteId`,`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Page` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `title` LONGTEXT NOT NULL,
  `slug` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `contentHtml` LONGTEXT NOT NULL,
  `contentJson` LONGTEXT NOT NULL,
  `status` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `metaTitle` LONGTEXT NULL,
  `metaDescription` LONGTEXT NULL,
  `ogImage` LONGTEXT NULL,
  `publishedAt` VARCHAR(32) NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `siteId_slug` (`siteId`,`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Post` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `title` LONGTEXT NOT NULL,
  `slug` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `excerpt` LONGTEXT NULL,
  `contentHtml` LONGTEXT NOT NULL,
  `contentJson` LONGTEXT NOT NULL,
  `featuredImage` LONGTEXT NULL,
  `status` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `categoryId` VARCHAR(191) COLLATE utf8mb4_bin NULL,
  `publishedAt` VARCHAR(32) NULL,
  `scheduledAt` VARCHAR(32) NULL,
  `metaTitle` LONGTEXT NULL,
  `metaDescription` LONGTEXT NULL,
  `ogImage` LONGTEXT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `siteId_slug` (`siteId`,`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PostTag` (
  `postId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `tagId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`postId`,`tagId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ContentVersion` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `entityType` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `entityId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `versionNumber` INT NOT NULL,
  `title` LONGTEXT NOT NULL,
  `contentHtml` LONGTEXT NOT NULL,
  `contentJson` LONGTEXT NOT NULL,
  `snapshotData` LONGTEXT NOT NULL,
  `createdBy` LONGTEXT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `entity_index` (`entityType`,`entityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Media` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NULL,
  `filename` LONGTEXT NOT NULL,
  `originalName` LONGTEXT NOT NULL,
  `mimeType` LONGTEXT NOT NULL,
  `sizeBytes` INT NOT NULL,
  `url` LONGTEXT NOT NULL,
  `altText` LONGTEXT NULL,
  `caption` LONGTEXT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `siteId_index` (`siteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Menu` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `name` LONGTEXT NOT NULL,
  `location` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `itemsJson` LONGTEXT NOT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  `updatedAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `siteId_index` (`siteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
  `id` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `siteId` VARCHAR(191) COLLATE utf8mb4_bin NULL,
  `actor` LONGTEXT NOT NULL,
  `action` LONGTEXT NOT NULL,
  `entityType` VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  `entityId` VARCHAR(191) COLLATE utf8mb4_bin NULL,
  `details` LONGTEXT NOT NULL,
  `ipAddress` LONGTEXT NULL,
  `createdAt` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `siteId_index` (`siteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `SiteMembership` ADD CONSTRAINT `SiteMembership_user_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE;

ALTER TABLE `SiteMembership` ADD CONSTRAINT `SiteMembership_site_fk` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE CASCADE;

ALTER TABLE `Session` ADD CONSTRAINT `Session_user_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE;

ALTER TABLE `SiteSetting` ADD CONSTRAINT `SiteSetting_site_fk` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE CASCADE;

ALTER TABLE `Category` ADD CONSTRAINT `Category_site_fk` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE CASCADE;

ALTER TABLE `Tag` ADD CONSTRAINT `Tag_site_fk` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE CASCADE;

ALTER TABLE `Page` ADD CONSTRAINT `Page_site_fk` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE CASCADE;

ALTER TABLE `Post` ADD CONSTRAINT `Post_site_fk` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE CASCADE;

ALTER TABLE `Post` ADD CONSTRAINT `Post_category_fk` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`) ON DELETE SET NULL;

ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_post_fk` FOREIGN KEY (`postId`) REFERENCES `Post` (`id`) ON DELETE CASCADE;

ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_tag_fk` FOREIGN KEY (`tagId`) REFERENCES `Tag` (`id`) ON DELETE CASCADE;

ALTER TABLE `Media` ADD CONSTRAINT `Media_site_fk` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE SET NULL;

ALTER TABLE `Menu` ADD CONSTRAINT `Menu_site_fk` FOREIGN KEY (`siteId`) REFERENCES `Site` (`id`) ON DELETE CASCADE;

CREATE TABLE `CmsRate` (`bucket` VARCHAR(191) PRIMARY KEY, `hits` INT NOT NULL, `expires` BIGINT NOT NULL) ENGINE=InnoDB;

CREATE TABLE `CmsLock` (`id` INT PRIMARY KEY) ENGINE=InnoDB;

INSERT INTO `CmsLock` (`id`) VALUES (1);
KEDATA_SCHEMA;
