# Berkay Hub

Berkay Hub; kulup yonetimi, akademik planlayici, Google Calendar senkronu ve guvenlik kamerasi panelini tek bir merkezi portaldan yonetmek icin gelistirilen moduler bir web uygulamasidir.

Proje iki ana parcadan olusur:

```text
central-hub/
├── central-hub-frontend/      # Vanilla JS + Tailwind CDN statik frontend
├── berkay-hub-backend/        # Java Spring Boot + SQLite REST API
├── deploy/                    # Docker Compose, Nginx ve deploy dosyalari
├── scripts/                   # Yardimci scriptler
└── README.md                  # Bu dosya
```

## Guncel Durum

- Frontend statik HTML/CSS/Vanilla JS olarak calisir.
- Backend Spring Boot 3.3.5, Java 17, SQLite ve Spring Security kullanir.
- Login/signup artik backend uzerinden yapilir.
- Frontend demo/local auth fallback kodlari kaldirildi; backend yoksa demo moda dusmez.
- Yeni kullanicilar signup sonrasi `USER`/`UYE` yetkisiyle baslar.
- Admin paneli frontend tarafinda rol bazli gizlenir, backend tarafinda kamera endpointleri `ADMIN` rolu ister.
- VDS/domain olmayan senaryoda uygulama IP uzerinden yayinlanabilir.

## Yapilan Ana Gelistirmeler

### Frontend Tasarim

- Koyu tema korundu.
- Ana dashboard kartlari daha profesyonel hale getirildi.
- Kulup yonetimi, akademik planlayici ve guvenlik kamerasi sayfalari ortak modern kart/panel diline cekildi.
- `assets/css/style.css` icinde dashboard, takim kartlari, planlayici ve Google Calendar paneli icin yeni stiller eklendi.

### Auth, Sign In ve Sign Up

- Ana ekrana Sign in / Sign up sekmeleri eklendi.
- Backend API URL alani eklendi.
- Signup formu eklendi.
- Signup sifre minimumu frontend/backend tarafinda 6 karakter yapildi.
- Backend'e `POST /api/auth/signup` endpointi eklendi.
- Hatali sifre veya hatali e-posta artik demo oturum olusturmaz.
- `admin123 + rastgele e-posta` acigi kapatildi.
- Frontend'deki demo admin/demo user butonlari kaldirildi.
- Frontend'deki demo/local fallback veri seti ve demo login akisi kaldirildi.
- Production/IP ortaminda eski `http://localhost:8080/api` API adresi localStorage'da kaldiysa otomatik `/api`ye cekilir.

### Roller

Frontend rol listesi:

```text
Uye
Takim Uyesi
Takim Kaptani
Departman Baskan Yardimcisi
Departman Baskani
Yonetim Kurulu Uyesi
Kulup Baskan Yardimcisi
Kulup Baskani
Denetim Kurulu Uyesi
Admin
```

Not: Backend su an temel olarak `USER` ve `ADMIN` rollerini kullanir. Detayli rol yetkilendirmeleri frontend tarafinda hazirlandi; kalici ve guvenli rol yetki modeli icin backend rol tablosu/endpointleri daha sonra genisletilmelidir.

### Kulup Yonetimi

- "Uye Ekle" yaklasimi kaldirildi; sistem artik uyelerin kendi hesaplariyla kullanmasi icin hazirlandi.
- Admin'e ozel "Rol Ata" alani eklendi.
- Takim bloklari eklendi.
- Takim icinde uye kartlari gosterildi.
- Uye kartina tiklaninca profil/ozet alani acilir.
- Uye profili uzerinden gorev atama ve rapor ekleme akisi birlestirildi.
- Takim ekle/cikar sekmesi eklendi.
- Takim, gorev, rapor ve rol formlarinda async `event.currentTarget` kaynakli reset hatalari duzeltildi.

### Akademik Planlayici

- Eski akademik etkinlik akisi korundu.
- Ders programi modulu eklendi.
- Ders programi, `/home/berkay/projects/ders-planlayici` projesindeki HTML/CSS/JS mantigi merkezi akademik planlayiciya tasinacak sekilde entegre edildi.
- CSV yukleme, ders arama, sube secme, cakisma gosterimi ve Excel export kontrolleri eklendi.
- Ders programi daha genis/tam ekran gorunume cekildi.
- Takvim baslik/govde scroll senkronu duzeltildi.

### Google Calendar

Akademik planlayiciya `Takvim` sekmesi eklendi.

Eklenenler:

- Google Client ID ve API Key giris alani
- Google yetkilendirme butonu
- Baglantiyi kesme butonu
- Uye takvim kartlari
- Secilen uye icin takvim sayfasi
- Google Calendar etkinligi olusturma formu
- Akademik etkinlikleri Google Calendar'a senkronlama
- Yaklasan Google Calendar etkinliklerini listeleme

Google entegrasyonu icin Google Cloud tarafinda:

- Calendar API aktif olmali.
- OAuth Web Client ID olusturulmali.
- API Key olusturulmali.
- Authorized JavaScript origins alanina yayin adresi eklenmeli.

Ornekler:

```text
http://localhost:5500
http://SUNUCU_IP
http://SUNUCU_IP:5500
```

Not: Tarayici tarafindaki Google token kalici olarak backend'e kaydedilmiyor. Uretim seviyesinde kalici ve daha guvenli Google Calendar entegrasyonu icin backend OAuth/refresh token akisi eklenmelidir.

### Guvenlik Kameralari

- Guvenlik kamerasi modulu admin'e ozel hale getirildi.
- Kamera endpointleri backend'de `@PreAuthorize("hasRole('ADMIN')")` ile korunur.
- Frontend tarafinda admin olmayan kullanicidan guvenlik karti gizlenir.

## Backend Ozeti

Backend dizini:

```text
berkay-hub-backend/
├── pom.xml
├── src/main/java/com/berkayhub/
│   ├── auth/
│   ├── club/
│   ├── academic/
│   ├── camera/
│   ├── config/
│   └── system/
└── src/main/resources/application.yml
```

Teknolojiler:

- Java 17
- Spring Boot 3.3.5
- Spring Web
- Spring Data JPA
- Spring Security
- SQLite
- Hibernate community SQLite dialect

Varsayilan backend portu:

```text
8080
```

Varsayilan SQLite dosyasi:

```text
berkay-hub-backend/data/berkay-hub.sqlite
```

### Auth Endpointleri

```text
POST /api/auth/login
POST /api/auth/signup
GET  /api/auth/me
POST /api/auth/logout
```

### Diger Endpointler

```text
GET  /api/club/overview
POST /api/club/reports
POST /api/club/tasks
PUT  /api/club/tasks/{id}/toggle
POST /api/club/assignments

GET  /api/academic/events
POST /api/academic/events

GET  /api/cameras
POST /api/cameras

GET  /api/system/metrics
GET  /api/health
```

## Varsayilan Kullanici Bilgileri

Backend ilk kurulumda data seed eder:

| Rol | E-posta | Sifre |
| --- | --- | --- |
| Admin | `admin@berkayhub.local` | `admin123` |
| User | `user@berkayhub.local` | `user123` |

Onemli:

- Uretimde bu varsayilan sifreler degistirilmelidir.
- `admin123` sadece gercek admin e-postasi ile calismalidir.
- Rastgele e-posta + `admin123` girisi kabul edilmemelidir.

## Local Calistirma

### Backend

```bash
cd berkay-hub-backend
mvn spring-boot:run
```

Backend:

```text
http://localhost:8080/api
```

### Frontend

Ayrı terminal:

```bash
cd central-hub-frontend
python3 -m http.server 5500
```

Frontend:

```text
http://localhost:5500
```

Local ortamda varsayilan API URL:

```text
http://localhost:8080/api
```

VDS/IP/domain ortaminda varsayilan API URL:

```text
/api
```

## VDS Deploy

Domain yoksa uygulama IP ile yayinlanabilir.

### 1. Sunucu Hazirligi

```bash
apt update && apt upgrade -y
apt install -y git curl ufw ca-certificates gnupg
```

Docker icin resmi Docker apt deposunun kurulmasi tavsiye edilir. Bazi sistemlerde `docker-compose-plugin` varsayilan Ubuntu/Debian deposunda bulunmaz.

Docker kurulumundan sonra:

```bash
docker --version
docker compose version
```

### 2. Projeyi Sunucuya Alma

```bash
cd /opt
git clone https://github.com/Berkaybaba442/central-hub.git central-hub
```

Var olan repo icin:

```bash
cd /opt/central-hub
git pull
```

### 3. Docker Compose ile Calistirma

```bash
cd /opt/central-hub/deploy
docker compose up -d --build
```

Mevcut `deploy/docker-compose.yml` frontend'i varsayilan olarak `5500:80` portundan yayinlar. Bu durumda adres:

```text
http://SUNUCU_IP:5500
```

Port 80'den yayinlamak istersen `deploy/docker-compose.yml` icinde frontend portunu su hale getir:

```yaml
ports:
  - "80:80"
```

Sonra:

```bash
docker compose down
docker compose up -d --build --force-recreate
```

### 4. Firewall

Port 80 kullanilacaksa:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw enable
```

Port 5500 kullanilacaksa:

```bash
ufw allow OpenSSH
ufw allow 5500/tcp
ufw enable
```

## VDS Guncelleme Akisi

Yerelde degisiklikleri GitHub'a gonder:

```bash
git add .
git commit -m "Update Berkay Hub"
git push
```

Sunucuda:

```bash
cd /opt/central-hub
git pull
cd deploy
docker compose down
docker compose up -d --build --force-recreate
```

## VDS Git Pull Sorunu

Eger `git pull` sirasinda su hata alinirsa:

```text
error: Your local changes to the following files would be overwritten by merge
```

Sunucudaki dosyalarda elle degisiklik yapilmis demektir. Sunucudaki degisiklikleri atip GitHub'daki son surumu almak icin:

```bash
cd /opt/central-hub
git status --short
git restore central-hub-frontend/assets/js/api.js central-hub-frontend/index.html
git pull --ff-only
```

Sonra:

```bash
cd deploy
docker compose down
docker compose up -d --build --force-recreate
```

## Demo Kodunun Kalmadigini Kontrol Etme

Guncel frontend cache etiketi:

```text
20260622-authnodemo
```

Sunucuda yeni kodun servis edildigini kontrol et:

```bash
curl -s http://SUNUCU_IP/ | grep authnodemo
curl -s "http://SUNUCU_IP/assets/js/api.js?v=20260622-authnodemo" | grep -E "demo|fallback|admin123|createDemoUser"
```

Beklenen:

- Ilk komut `authnodemo` gostermeli.
- Ikinci komut hicbir cikti vermemeli.

Eger ikinci komut demo/fallback/admin123 cikti veriyorsa VDS hala eski frontend dosyasini servis ediyor demektir. `git pull` basarisiz olmus olabilir veya Docker eski volume/dosya ile kalkmis olabilir.

## Tarayici Storage Temizligi

Auth bilgileri cookie yerine `localStorage` icinde tutulur.

Tarayicida console acip:

```js
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Dogrulama Komutlari

Backend test:

```bash
cd berkay-hub-backend
mvn -q test
```

Backend paketleme:

```bash
cd berkay-hub-backend
mvn -q -DskipTests package
```

Frontend statik dosya kontrolu:

```bash
rg -n "demo|fallback|admin123|createDemoUser" central-hub-frontend/assets/js/api.js
```

Guncel durumda bu komut demo/fallback icin cikti vermemelidir.

## Bilinen Notlar ve Sonraki Isler

- Backend rol modeli su an `USER` ve `ADMIN` temelli. Detayli kulup rolleri backend'e kalici olarak eklenmeli.
- Frontend tarafindaki rol atama simdilik local/arayuz agirlikli; kalici ve guvenli rol atama icin backend endpointleri eklenmeli.
- Default admin sifresi uretimde degistirilmeli.
- Domain alindiktan sonra HTTPS icin Nginx + Let's Encrypt kurulmalı.
- Google Calendar icin production seviyesinde backend OAuth akisi eklenmeli.
- VDS'de `target/` derleme ciktisi GitHub'a pushlanmamalidir.

