# Info for dev

## Update prism schema in docker compose when data loss can happen

```sh
docker compose run --rm app npx prisma db push --accept-data-loss
```

## Backfill recipe origins

`Recipe.origin` records how a recipe got here (hand-typed, parsed, parsed and
then edited, AI-parsed, AI-written). Recipes captured before the column existed
have none, so they show no origin badge and only turn up under the "Unknown"
origin filter. To label them by what can still be told apart — anything with a
source URL was parsed, the rest were typed in:

```sh
docker compose exec db psql -U postgres -d recipevault -c \
  "UPDATE \"Recipe\" SET origin = CASE WHEN \"sourceUrl\" IS NOT NULL THEN 'PARSED' ELSE 'MANUAL' END WHERE origin IS NULL;"
```
