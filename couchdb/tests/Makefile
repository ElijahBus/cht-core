.EXPORT_ALL_VARIABLES:
# COUCHDB_PASSWORD:=h@llo
# COUCHDB_USER:=el!@*lo
COUCHDB_PASSWORD:=hllo
COUCHDB_USER:=ello
test:
	docker compose up --build --wait
	docker compose run sut
	docker compose down

clean:
	docker compose down --rmi local
