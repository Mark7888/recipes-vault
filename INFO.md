# Info for dev

## Update prism schema in docker compose when data loss can happen

```sh
docker compose run --rm app npx prisma db push --accept-data-loss
```
