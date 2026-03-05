CREATE TYPE "public"."condition" AS ENUM('NEAR MINT', 'LIGHTLY PLAYED', 'MODERATELY PLAYED', 'HEAVILY PLAYED', 'DAMAGED');--> statement-breakpoint
CREATE TYPE "public"."edition" AS ENUM('ANY', '1ST EDITION', 'LIMITED', 'UNLIMITED');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('DISABLED', 'HIDE', 'ENABLED', 'PRIORITY', 'FORCE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "cards_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"price" real NOT NULL,
	"quantity" integer NOT NULL,
	"direct_quantity" integer NOT NULL,
	"condition" "condition" NOT NULL,
	"edition" "edition" NOT NULL,
	"printing_id" integer NOT NULL,
	"seller_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "printings" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_no" integer NOT NULL,
	"set_name" text NOT NULL,
	"set_code" text NOT NULL,
	"rarity" text NOT NULL,
	"market_price" real NOT NULL,
	"card_id" integer NOT NULL,
	"max_price" integer,
	"priority" "priority" NOT NULL,
	"desired_quantity" integer NOT NULL,
	"desired_edition" "edition" NOT NULL,
	"desired_condition" "condition" NOT NULL,
	"last_scraped" timestamp,
	"sales_last_scraped" timestamp,
	"good_deal_price" real
);
--> statement-breakpoint
CREATE TABLE "sales_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"condition" "condition" NOT NULL,
	"edition" "edition" NOT NULL,
	"quantity" integer NOT NULL,
	"purchase_price" real NOT NULL,
	"shipping_price" real NOT NULL,
	"order_date" timestamp NOT NULL,
	"printing_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"shipping" real NOT NULL,
	"rating" real NOT NULL,
	"number_of_sales" text NOT NULL,
	"free_shipping" boolean NOT NULL,
	"gold" boolean NOT NULL,
	"direct" boolean NOT NULL,
	"verified" boolean NOT NULL,
	"blocked" boolean NOT NULL,
	CONSTRAINT "sellers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_printing_id_printings_id_fk" FOREIGN KEY ("printing_id") REFERENCES "public"."printings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printings" ADD CONSTRAINT "printings_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_history" ADD CONSTRAINT "sales_history_printing_id_printings_id_fk" FOREIGN KEY ("printing_id") REFERENCES "public"."printings"("id") ON DELETE no action ON UPDATE no action;