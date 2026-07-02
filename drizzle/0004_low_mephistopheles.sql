CREATE TABLE "staging_test_table_1560" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staging_test_table_1560_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"test_value" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
