CREATE TABLE "wanted_activation_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_by" text,
	"created_by" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"used_at" timestamp,
	CONSTRAINT "wanted_activation_codes_code_unique" UNIQUE("code")
);
