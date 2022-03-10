# Reimagine-API

testing locally...

run `./localstack.sh` in a terminal
run `npm run test`

### How DB could be better

- segments sort key should probably have offset at the front so we don't have to order them through the application
- recordings should have pieceId, arrangementId denormalized in the db object to avoid excessive round trips
- pieces should display in alphabetical order by default
- arrangement -> mixes
