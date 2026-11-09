# BASHMAK PC — оптимизация ПК

Лендинг для услуг по оптимизации ПК: чистая установка Windows, твики, настройка BIOS/UEFI, охлаждение и отклик системы.

## Структура

- `index.html` — главная страница
- `admin.html` — админ-панель для добавления отзывов
- `styles.css`, `app.js` — стили и логика
- `serve.mjs` — локальный сервер с API для отзывов
- `reviews.json` — общий файл отзывов (его читает сайт)
- `assets/` — логотип, фавикон, локальный бандл шейдера

## Локальный запуск

```bash
node serve.mjs
```

Сайт: http://localhost:8080 · Админ-панель: http://localhost:8080/admin.html

В локальном режиме ключ администратора — пароль сервера. По умолчанию `bashmak-admin`, переопределяется переменной окружения `ADMIN_KEY`.

## GitHub Pages

Сайт: https://optimizationpc.github.io/optimizationpc/

Отзывы хранятся в `reviews.json` в репозитории, поэтому они общие для всех посетителей, а не локальные для браузера. Главная страница читает файл напрямую с GitHub (с обходом кэша) и подхватывает новые отзывы без пересборки сайта.

### Как добавить отзыв на рабочем сайте

1. Откройте https://optimizationpc.github.io/optimizationpc/admin.html
2. В поле «Ключ администратора» вставьте **fine-grained GitHub token**:
   - Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Repository access: только `OptimizationPC/optimizationpc`
   - Permissions → Contents: **Read and write**
3. Заполните отзыв и нажмите «Сохранить отзыв».

Токен не хранится на сайте: он отправляется только в `api.github.com` и остаётся в текущей вкладке браузера. После добавления отзыва GitHub обновляет `reviews.json`, и отзыв появляется на сайте в течение 1–5 минут.

Чтобы удалить или изменить отзыв, отредактируйте `reviews.json` в репозитории (или удалите отзыв через GitHub API тем же токеном).
