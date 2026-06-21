# Berkay Hub Backend

Java Spring Boot + SQLite REST API.

## Çalıştırma

```bash
mvn spring-boot:run
```

API:

```text
http://localhost:8080/api
```

## Varsayılan Kullanıcılar

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Admin | `admin@berkayhub.local` | `admin123` |
| User | `user@berkayhub.local` | `user123` |

## Endpoint Özeti

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Kulüp Yönetimi

- `GET /api/club/overview`
- `GET /api/club/reports`
- `POST /api/club/reports`
- `GET /api/club/tasks`
- `POST /api/club/tasks`
- `PUT /api/club/tasks/{id}/toggle`
- `GET /api/club/assignments`
- `POST /api/club/assignments`

### Akademik Planlayıcı

- `GET /api/academic/events`
- `POST /api/academic/events`

### Güvenlik Kameraları

- `GET /api/cameras` — admin gerekli
- `POST /api/cameras` — admin gerekli

### Sistem

- `GET /api/system/metrics`
