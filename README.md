# BASHMAK PC — оптимизация ПК

Лендинг для услуг по оптимизации ПК: чистая установка Windows, твики, настройка BIOS/UEFI, охлаждение и отклик системы.

## Структура

- `index.html` — главная страница
- `admin.html` — админ-панель для управления отзывами (требует локального сервера)
- `styles.css`, `app.js` — стили и логика
- `serve.mjs` — локальный сервер с API для отзывов
- `reviews.json` — отзывы (используется на GitHub Pages)
- `assets/` — логотип, фавикон, локальный бандл шейдера

## Локальный запуск

```bash
node serve.mjs
```

Сайт: http://localhost:8080 · Админ-панель: http://localhost:8080/admin.html

Ключ администратора по умолчанию — `bashmak-admin` (переопределяется через переменную `ADMIN_KEY`).

## GitHub Pages

Сайт: https://optimizationpc.github.io/optimizationpc/

На GitHub Pages API недоступно, поэтому отзывы подтягиваются из `reviews.json`. После добавления новых отзывов через админ-панель обновите `reviews.json` в репозитории.
