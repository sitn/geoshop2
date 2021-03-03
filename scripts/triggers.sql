CREATE FUNCTION geoshop.update_product_tsvector()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
    BEGIN
        NEW.ts := to_tsvector('french', NEW.label || ' ' || (
            SELECT concat(description_long, ' ' , description_short) FROM geoshop.metadata WHERE id = NEW.metadata_id
        ));
        RETURN NEW;
    END;
$BODY$;

CREATE FUNCTION geoshop.update_metadata_tsvector()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
    BEGIN
        UPDATE geoshop.product p
        SET ts = to_tsvector('french', label || ' ' || concat(NEW.description_long, ' ' , NEW.description_short))
        WHERE NEW.id = p.metadata_id;
        RETURN NEW;
    END;
$BODY$;

CREATE TRIGGER update_product_tsvector_trigger
    BEFORE INSERT OR UPDATE OF label
    ON geoshop.product
    FOR EACH ROW
    EXECUTE PROCEDURE geoshop.update_product_tsvector();

CREATE TRIGGER update_metadata_tsvector_trigger
    BEFORE INSERT OR UPDATE OF description_short, description_long
    ON geoshop.metadata
    FOR EACH ROW
    EXECUTE PROCEDURE geoshop.update_metadata_tsvector();
