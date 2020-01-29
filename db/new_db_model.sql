-- Database generated with pgModeler (PostgreSQL Database Modeler).
-- pgModeler  version: 0.9.2
-- PostgreSQL version: 10.0
-- Project Site: pgmodeler.io
-- Model Author: ---

-- -- object: geoshop | type: ROLE --
-- -- DROP ROLE IF EXISTS geoshop;
-- CREATE ROLE geoshop WITH 
-- 	LOGIN
-- 	ENCRYPTED PASSWORD 'geoshop';
-- -- ddl-end --
-- 

-- Database creation must be done outside a multicommand file.
-- These commands were put in this file only as a convenience.
-- -- object: geoshop | type: DATABASE --
-- -- DROP DATABASE IF EXISTS geoshop;
-- CREATE DATABASE geoshop
-- 	OWNER = geoshop;
-- -- ddl-end --
-- 

-- object: geoshop | type: SCHEMA --
-- DROP SCHEMA IF EXISTS geoshop CASCADE;
CREATE SCHEMA geoshop;
-- ddl-end --
-- ALTER SCHEMA geoshop OWNER TO geoshop;
-- ddl-end --

SET search_path TO pg_catalog,public,geoshop;
-- ddl-end --

-- object: postgis | type: EXTENSION --
-- DROP EXTENSION IF EXISTS postgis CASCADE;
CREATE EXTENSION postgis
WITH SCHEMA public;
-- ddl-end --

-- object: "uuid-ossp" | type: EXTENSION --
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION "uuid-ossp"
WITH SCHEMA public;
-- ddl-end --

-- object: geoshop.pricing | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.pricing CASCADE;
CREATE TABLE geoshop.pricing (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	product_id uuid,
	type text,
	price numeric,
	CONSTRAINT pricing_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop.pricing OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.product_status | type: TYPE --
-- DROP TYPE IF EXISTS geoshop.product_status CASCADE;
CREATE TYPE geoshop.product_status AS
 ENUM ('draft','valid','deprecated');
-- ddl-end --
-- ALTER TYPE geoshop.product_status OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.user_status | type: TYPE --
-- DROP TYPE IF EXISTS geoshop.user_status CASCADE;
CREATE TYPE geoshop.user_status AS
 ENUM ('new','enabled','disabled');
-- ddl-end --
-- ALTER TYPE geoshop.user_status OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.metadata | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.metadata CASCADE;
CREATE TABLE geoshop.metadata (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	name text,
	description_short text,
	description_long text,
	geocat_link text,
	legend_link text,
	image_link text,
	copyright_id uuid,
	CONSTRAINT metadata_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop.metadata OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.product | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.product CASCADE;
CREATE TABLE geoshop.product (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	metadata_id uuid,
	label text,
	status geoshop.product_status,
	is_published bool NOT NULL DEFAULT false,
	base_fee numeric,
	is_group bool NOT NULL DEFAULT false,
	CONSTRAINT product_pk PRIMARY KEY (id)

);
-- ddl-end --
COMMENT ON COLUMN geoshop.product.is_group IS E'Si le produit est en fait un groupe de produits';
-- ddl-end --
-- ALTER TABLE geoshop.product OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.format | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.format CASCADE;
CREATE TABLE geoshop.format (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	name text,
	CONSTRAINT format_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop.format OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.product_format_availability | type: TYPE --
-- DROP TYPE IF EXISTS geoshop.product_format_availability CASCADE;
CREATE TYPE geoshop.product_format_availability AS
 ENUM ('automatic','manual');
-- ddl-end --
-- ALTER TYPE geoshop.product_format_availability OWNER TO postgres;
-- ddl-end --

-- object: geoshop.product_format | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.product_format CASCADE;
CREATE TABLE geoshop.product_format (
	product_id uuid NOT NULL,
	format_id uuid NOT NULL,
	availability geoshop.product_format_availability,
	CONSTRAINT product_data_format_pk PRIMARY KEY (product_id,format_id)

);
-- ddl-end --
-- ALTER TABLE geoshop.product_format OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.product_group | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.product_group CASCADE;
CREATE TABLE geoshop.product_group (
	product_id_parent uuid NOT NULL,
	product_id_child uuid NOT NULL,
	CONSTRAINT product_group_pk PRIMARY KEY (product_id_parent,product_id_child)

);
-- ddl-end --
-- ALTER TABLE geoshop.product_group OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.order_item | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.order_item CASCADE;
CREATE TABLE geoshop.order_item (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	order_id uuid,
	product_id uuid,
	format_id uuid,
	last_download timestamp,
	CONSTRAINT order_item_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop.order_item OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.identity | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.identity CASCADE;
CREATE TABLE geoshop.identity (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	firstname text,
	lastname text,
	street text,
	street2 text,
	postcode smallint,
	city text,
	country text,
	companyname text,
	phone text,
	sap_id bigint,
	contract_accepted date,
	CONSTRAINT identity_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop.identity OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.role | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.role CASCADE;
CREATE TABLE geoshop.role (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	name text,
	CONSTRAINT role_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop.role OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.user_role | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.user_role CASCADE;
CREATE TABLE geoshop.user_role (
	user_id uuid NOT NULL,
	role_id uuid NOT NULL,
	CONSTRAINT user_role_pk PRIMARY KEY (user_id,role_id)

);
-- ddl-end --
-- ALTER TABLE geoshop.user_role OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.copyright | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.copyright CASCADE;
CREATE TABLE geoshop.copyright (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	description text,
	CONSTRAINT copyright_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop.copyright OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.document | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.document CASCADE;
CREATE TABLE geoshop.document (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	name text,
	link text,
	CONSTRAINT documents_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop.document OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.metadata_document | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.metadata_document CASCADE;
CREATE TABLE geoshop.metadata_document (
	metadata_id uuid NOT NULL,
	document_id uuid NOT NULL,
	CONSTRAINT metadata_documents_pk PRIMARY KEY (metadata_id,document_id)

);
-- ddl-end --
-- ALTER TABLE geoshop.metadata_document OWNER TO geoshop;
-- ddl-end --

-- object: geoshop.metadata_identity | type: TABLE --
-- DROP TABLE IF EXISTS geoshop.metadata_identity CASCADE;
CREATE TABLE geoshop.metadata_identity (
	metadata_id uuid NOT NULL,
	identity_id uuid NOT NULL,
	CONSTRAINT metadata_identity_pk PRIMARY KEY (metadata_id,identity_id)

);
-- ddl-end --
-- ALTER TABLE geoshop.metadata_identity OWNER TO geoshop;
-- ddl-end --

-- object: geoshop."order" | type: TABLE --
-- DROP TABLE IF EXISTS geoshop."order" CASCADE;
CREATE TABLE geoshop."order" (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	total_cost numeric,
	vat numeric,
	geom polygon,
	user_id uuid,
	CONSTRAINT order_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop."order" OWNER TO geoshop;
-- ddl-end --

-- object: geoshop."user" | type: TABLE --
-- DROP TABLE IF EXISTS geoshop."user" CASCADE;
CREATE TABLE geoshop."user" (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	password text,
	email text NOT NULL,
	identity_id uuid,
	status geoshop.user_status,
	CONSTRAINT user_pk PRIMARY KEY (id)

);
-- ddl-end --
-- ALTER TABLE geoshop."user" OWNER TO geoshop;
-- ddl-end --

-- object: order_user | type: CONSTRAINT --
-- ALTER TABLE geoshop."order" DROP CONSTRAINT IF EXISTS order_user CASCADE;
ALTER TABLE geoshop."order" ADD CONSTRAINT order_user FOREIGN KEY (id)
REFERENCES geoshop."user" (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: product_pricing | type: CONSTRAINT --
-- ALTER TABLE geoshop.pricing DROP CONSTRAINT IF EXISTS product_pricing CASCADE;
ALTER TABLE geoshop.pricing ADD CONSTRAINT product_pricing FOREIGN KEY (product_id)
REFERENCES geoshop.product (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: metadata_copyright | type: CONSTRAINT --
-- ALTER TABLE geoshop.metadata DROP CONSTRAINT IF EXISTS metadata_copyright CASCADE;
ALTER TABLE geoshop.metadata ADD CONSTRAINT metadata_copyright FOREIGN KEY (copyright_id)
REFERENCES geoshop.copyright (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: product_metadata | type: CONSTRAINT --
-- ALTER TABLE geoshop.product DROP CONSTRAINT IF EXISTS product_metadata CASCADE;
ALTER TABLE geoshop.product ADD CONSTRAINT product_metadata FOREIGN KEY (metadata_id)
REFERENCES geoshop.metadata (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: product_formats_product | type: CONSTRAINT --
-- ALTER TABLE geoshop.product_format DROP CONSTRAINT IF EXISTS product_formats_product CASCADE;
ALTER TABLE geoshop.product_format ADD CONSTRAINT product_formats_product FOREIGN KEY (product_id)
REFERENCES geoshop.product (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: product_formats_formats | type: CONSTRAINT --
-- ALTER TABLE geoshop.product_format DROP CONSTRAINT IF EXISTS product_formats_formats CASCADE;
ALTER TABLE geoshop.product_format ADD CONSTRAINT product_formats_formats FOREIGN KEY (format_id)
REFERENCES geoshop.format (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: product_group_parent | type: CONSTRAINT --
-- ALTER TABLE geoshop.product_group DROP CONSTRAINT IF EXISTS product_group_parent CASCADE;
ALTER TABLE geoshop.product_group ADD CONSTRAINT product_group_parent FOREIGN KEY (product_id_parent)
REFERENCES geoshop.product (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: product_group_child | type: CONSTRAINT --
-- ALTER TABLE geoshop.product_group DROP CONSTRAINT IF EXISTS product_group_child CASCADE;
ALTER TABLE geoshop.product_group ADD CONSTRAINT product_group_child FOREIGN KEY (product_id_child)
REFERENCES geoshop.product (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: order_item_order | type: CONSTRAINT --
-- ALTER TABLE geoshop.order_item DROP CONSTRAINT IF EXISTS order_item_order CASCADE;
ALTER TABLE geoshop.order_item ADD CONSTRAINT order_item_order FOREIGN KEY (order_id)
REFERENCES geoshop."order" (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: order_item_product | type: CONSTRAINT --
-- ALTER TABLE geoshop.order_item DROP CONSTRAINT IF EXISTS order_item_product CASCADE;
ALTER TABLE geoshop.order_item ADD CONSTRAINT order_item_product FOREIGN KEY (product_id)
REFERENCES geoshop.product (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: order_item_format | type: CONSTRAINT --
-- ALTER TABLE geoshop.order_item DROP CONSTRAINT IF EXISTS order_item_format CASCADE;
ALTER TABLE geoshop.order_item ADD CONSTRAINT order_item_format FOREIGN KEY (format_id)
REFERENCES geoshop.format (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: user_role_user | type: CONSTRAINT --
-- ALTER TABLE geoshop.user_role DROP CONSTRAINT IF EXISTS user_role_user CASCADE;
ALTER TABLE geoshop.user_role ADD CONSTRAINT user_role_user FOREIGN KEY (user_id)
REFERENCES geoshop."user" (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: user_role_role | type: CONSTRAINT --
-- ALTER TABLE geoshop.user_role DROP CONSTRAINT IF EXISTS user_role_role CASCADE;
ALTER TABLE geoshop.user_role ADD CONSTRAINT user_role_role FOREIGN KEY (role_id)
REFERENCES geoshop.role (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: metadata_document_metadata | type: CONSTRAINT --
-- ALTER TABLE geoshop.metadata_document DROP CONSTRAINT IF EXISTS metadata_document_metadata CASCADE;
ALTER TABLE geoshop.metadata_document ADD CONSTRAINT metadata_document_metadata FOREIGN KEY (metadata_id)
REFERENCES geoshop.metadata (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: metadata_document_document | type: CONSTRAINT --
-- ALTER TABLE geoshop.metadata_document DROP CONSTRAINT IF EXISTS metadata_document_document CASCADE;
ALTER TABLE geoshop.metadata_document ADD CONSTRAINT metadata_document_document FOREIGN KEY (document_id)
REFERENCES geoshop.document (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: metadata_identity_metadata | type: CONSTRAINT --
-- ALTER TABLE geoshop.metadata_identity DROP CONSTRAINT IF EXISTS metadata_identity_metadata CASCADE;
ALTER TABLE geoshop.metadata_identity ADD CONSTRAINT metadata_identity_metadata FOREIGN KEY (metadata_id)
REFERENCES geoshop.metadata (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: metadata_identity_identity | type: CONSTRAINT --
-- ALTER TABLE geoshop.metadata_identity DROP CONSTRAINT IF EXISTS metadata_identity_identity CASCADE;
ALTER TABLE geoshop.metadata_identity ADD CONSTRAINT metadata_identity_identity FOREIGN KEY (identity_id)
REFERENCES geoshop.identity (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: user_identity | type: CONSTRAINT --
-- ALTER TABLE geoshop."user" DROP CONSTRAINT IF EXISTS user_identity CASCADE;
ALTER TABLE geoshop."user" ADD CONSTRAINT user_identity FOREIGN KEY (id)
REFERENCES geoshop.identity (id) MATCH FULL
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --


