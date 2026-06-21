# Berkay Hub

Berkay Hub; kulüp yönetimi, akademik planlayıcı ve laboratuvar kamera panelini tek bir merkezi portaldan yöneten modüler bir web uygulamasıdır.

Bu paket iki ana bölümden oluşur:

```text
berkay-hub-project/
├── central-hub-frontend/      # Vanilla JS + Tailwind CDN statik frontend
├── berkay-hub-backend/        # Java Spring Boot + SQLite REST API
├── deploy/                    # Mini PC / VDS / Cloudflare Tunnel deploy dosyaları
└── scripts/                   # GitHub repo ve yardımcı scriptler
```

## Hızlı Çalıştırma

### 1) Backend

```bash
cd berkay-hub-backend
mvn spring-boot:run
```

Varsayılan API adresi:

```text
http://localhost:8080/api
```

Geliştirme kullanıcıları:

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Admin | `admin@berkayhub.local` | `admin123` |
| Kullanıcı | `user@berkayhub.local` | `user123` |

> Üretimde bu şifreleri mutlaka değiştir.

### 2) Frontend

Ayrı terminalde:

```bash
cd central-hub-frontend
python3 -m http.server 5500
```

Tarayıcıdan aç:

```text
http://localhost:5500
```

Frontend backend çalışmazsa demo moda düşer. Gerçek backend bağlantısı için giriş ekranındaki API adresini `http://localhost:8080/api` olarak bırak.

## Modüller

- **Ana Dashboard:** Rol bazlı modül kartları, sistem metrikleri ve giriş ekranı.
- **Kulüp Yönetimi:** Raporlar, yapılacaklar, takım atamaları.
- **Akademik Planlayıcı:** Ders, sınav, etkinlik ve proje takvimi.
- **Güvenlik Kameraları:** Admin'e özel kamera ve sistem izleme paneli.

## Deploy

`deploy/` klasöründe şunlar hazır gelir:

- `docker-compose.yml`
- `nginx.conf`
- `cloudflare-tunnel.yml.example`
- `setup-mini-pc.sh`

## GitHub

GitHub CLI kuruluysa:

```bash
bash scripts/create-github-repos.sh
```

Bu script, çoklu repo stratejisine uygun olarak frontend ve backend için ayrı repo oluşturmayı hedefler.
