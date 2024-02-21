# .EXPORT_ALL_VARIABLES:
# COUCHDB_PASSWORD:=h@llo
# COUCHDB_USER:=el!@*lo
export COUCHDB_PASSWORD := hllo
export COUCHDB_USER := ello

test:
	docker compose up --build --wait
	docker compose run --rm sut
	docker compose down

clean:
	docker compose down --rmi local || :
