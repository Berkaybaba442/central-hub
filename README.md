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
- Yeni kullanicilar signup sonrasi `USER` yetkisiyle baslar.
- Admin paneli frontend tarafinda rol bazli gizlenir, backend tarafinda kamera endpointleri `ADMIN` rolu ister.
- Admin kullanicilar uye hesaplarini gorebilir, rol guncelleyebilir ve uyelere gorev atayabilir.
- Gorev atanan uye ana sayfadaki bildirim panelinde ve ust bardaki zil gostergesinde bildirim gorur.
- Uye, atanmis gorevine rapor olarak dosya yukler. Dosyalar VDS uzerinde `BERKAY_HUB_REPORT_DIR` ile ayarlanan klasore kaydedilir.
- Admin, gonderilen rapor dosyasini VDS uzerinden indirir ve raporu kabul veya red durumuna alir.
- Google Calendar entegrasyonu backend tabanli OAuth akisiyle calisir; refresh tokenlar sifreli saklanir.
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
USER / Uye
Admin
```

Not: Backend su an temel olarak `USER` ve `ADMIN` rollerini kullanir. Takim uyesi, takim kaptani, departman baskani gibi detayli kulup rolleri daha sonra backend rol tablosu ve yetki modeliyle genisletilmelidir.

### Kulup Yonetimi

- "Uye Ekle" yaklasimi kaldirildi; sistem artik uyelerin kendi hesaplariyla kullanmasi icin hazirlandi.
- Admin'e ozel "Rol Ata" alani eklendi.
- Admin icin backend uzerinden gercek kullanici listesi cekilir.
- Admin, uyelere gorev atayabilir. Gorev kaydinda atanan uye e-postasi, atayan admin ve gorev aciklamasi tutulur.
- Gorev atanan uyeye bildirim olusturulur.
- Gorev tamamlaninca adminlere bildirim olusturulur.
- Takim bloklari eklendi.
- Takim icinde uye kartlari gosterildi.
- Uye kartina tiklaninca profil/ozet alani acilir.
- Uye profili uzerinden admin gorev atama akisina gecebilir.
- Uye kendi atanmis gorevi icin rapor dosyasi yukler; rapor metin olarak yazilmaz, dosya olarak VDS'e kaydedilir.
- Admin rapor dosyasini indirir, sonrasinda raporu `PENDING`, `APPROVED` veya `REJECTED` durumunda takip eder.
- Rapor gecmisinde yuklenen dosyanin orijinal adi gosterilir.
- Ana dashboard'a ayri `Bildirimler` paneli ve ust bar zil bildirimi eklendi.
- Takim ekle/cikar sekmesi eklendi.
- Takim, gorev, rapor ve rol formlarinda async `event.currentTarget` kaynakli reset hatalari duzeltildi.

### Bildirim ve Rapor Dosyasi Akisi

- `club_notifications` tablosu eklendi.
- `TASK_ASSIGNED`, `TASK_COMPLETED`, `REPORT_SUBMITTED` ve `REPORT_REVIEWED` tiplerinde bildirim altyapisi hazirlandi.
- Ana sayfada `Bildirimler` paneli eklendi.
- Ust navigasyonda okunmamis bildirim sayisini gosteren zil ikonu eklendi.
- Bildirimler kullanici e-postasina gore ayrilir.
- Bildirimler okundu olarak isaretlenebilir.
- Raporlar artik metin olarak yazilmaz; uye raporu dosya olarak yukler.
- Rapor dosyasi `multipart/form-data` ile backend'e gonderilir.
- Backend yuklenen dosyayi VDS uzerindeki rapor klasorune kaydeder.
- Rapor kaydinda dosyanin orijinal adi, kayitli dosya adi, dosya yolu, boyutu ve content type bilgisi tutulur.
- Admin raporu dosya olarak indirir.
- Admin raporu inceledikten sonra kabul veya red durumuna alir.

Varsayilan rapor klasoru:

```text
berkay-hub-backend/data/reports
```

VDS ortaminda klasor su ortam degiskeniyle degistirilebilir:

```text
BERKAY_HUB_REPORT_DIR=/app/data/reports
```

Docker Compose kullanildiginda backend `berkay_hub_data` volume'u `/app/data` altina baglanir. Bu nedenle varsayilan ayarla rapor dosyalari container yeniden baslasa bile volume icinde kalir.

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

- Backend tabanli Google OAuth baslatma ve callback akisi
- Kullanici bazli Google Calendar baglanti kaydi
- Refresh tokenlari AES-GCM ile sifreli saklama
- Token suresi doldugunda backend uzerinden otomatik access token yenileme
- Google yetkilendirme butonu
- Baglantiyi kesme butonu
- Uye takvim kartlari
- Admin icin uye takvim baglanti durumu gorunumu
- Kullanici izni olmadan baska uyenin takvim verisini okumama korumasi
- Google Calendar etkinligi olusturma formu
- Akademik etkinlikleri Google Calendar'a insert/patch mantigiyla senkronlama
- Kulup gorevlerini tarih araligi verilerek Google Calendar etkinligine donusturen backend endpointi
- Yaklasan Google Calendar etkinliklerini backend uzerinden listeleme
- Google etkinlikleri ile akademik etkinlikler arasinda temel cakisma uyarisi

Backend OAuth ayarlari ortam degiskenleriyle verilir:

```text
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8080/api/google-calendar/oauth/callback
BERKAY_HUB_GOOGLE_TOKEN_SECRET=uzun-rastgele-secret
BERKAY_HUB_FRONTEND_URL=http://localhost:5500/modules/academic-planner/index.html
BERKAY_HUB_TIME_ZONE=Europe/Istanbul
```

`BERKAY_HUB_GOOGLE_TOKEN_SECRET` bos olursa Google Calendar entegrasyonu backend tarafinda yapilandirilmamis kabul edilir ve token saklama yapilmaz.

Google entegrasyonu icin Google Cloud tarafinda:

- Calendar API aktif olmali.
- OAuth Web Client olusturulmali.
- Authorized JavaScript origins alanina frontend yayin adresi eklenmeli.
- Authorized redirect URIs alanina backend callback adresi eklenmeli.

Ornekler:

```text
Authorized JavaScript origins:
- http://localhost:5500
- http://SUNUCU_IP
- http://SUNUCU_IP:5500

Authorized redirect URIs:
- http://localhost:8080/api/google-calendar/oauth/callback
- http://SUNUCU_IP/api/google-calendar/oauth/callback
- http://SUNUCU_IP:8080/api/google-calendar/oauth/callback
```

Not: Callback URL Google Cloud'daki `Authorized redirect URIs` degeriyle birebir ayni olmalidir. Uygulama Nginx ile `/api` altindan yayinlaniyorsa production redirect URI genellikle `http://SUNUCU_IP/api/google-calendar/oauth/callback` veya HTTPS sonrasinda `https://DOMAIN/api/google-calendar/oauth/callback` olur.

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
│   ├── googlecalendar/
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

Varsayilan rapor dosyasi klasoru:

```text
berkay-hub-backend/data/reports
```

### Auth Endpointleri

```text
POST /api/auth/login
POST /api/auth/signup
GET  /api/auth/me
POST /api/auth/logout
GET  /api/auth/users
PATCH /api/auth/users/{id}/role
```

### Diger Endpointler

```text
GET  /api/club/overview
GET  /api/club/reports
POST /api/club/reports
GET  /api/club/reports/{id}/download
PUT  /api/club/reports/{id}/review
GET  /api/club/tasks
POST /api/club/tasks
PUT  /api/club/tasks/{id}/toggle
POST /api/club/tasks/{id}/reports
GET  /api/club/notifications
PUT  /api/club/notifications/{id}/read
GET  /api/club/assignments
POST /api/club/assignments

GET  /api/academic/events
POST /api/academic/events

GET    /api/google-calendar/status
GET    /api/google-calendar/members
POST   /api/google-calendar/oauth/start
GET    /api/google-calendar/oauth/callback
DELETE /api/google-calendar/connection
GET    /api/google-calendar/events
POST   /api/google-calendar/events
POST   /api/google-calendar/academic-events/{id}/sync
POST   /api/google-calendar/academic-events/sync
POST   /api/google-calendar/tasks/{id}/sync

GET  /api/cameras
POST /api/cameras

GET  /api/system/metrics
GET  /api/health
```

Notlar:

- `GET /api/auth/users` ve `PATCH /api/auth/users/{id}/role` admin yetkisi ister.
- `POST /api/club/tasks` admin yetkisi ister ve atanacak uyenin e-postasini `assigneeEmail` olarak bekler.
- `POST /api/club/tasks/{id}/reports` JSON degil `multipart/form-data` bekler.
- Rapor upload alanlari: `title`, opsiyonel `note`, zorunlu `file`.
- `GET /api/club/reports/{id}/download` yetkili admin veya raporu yukleyen uye tarafindan kullanilabilir.
- `PUT /api/club/reports/{id}/review` admin yetkisi ister ve `APPROVED` veya `REJECTED` durumlarini kabul eder.
- `GET /api/google-calendar/oauth/callback` Google redirect icin auth istemez; state kaydi uzerinden kullaniciyi bulur.
- Google Calendar event listeleme/olusturma ve senkron endpointleri sadece giris yapan kullanicinin kendi Google baglantisini kullanir.
- `GET /api/google-calendar/members` admin icin tum uyelerin baglanti durumunu, normal uye icin sadece kendi durumunu dondurur.
- `POST /api/google-calendar/tasks/{id}/sync` gorev icin `startsAt` ve `endsAt` alanlarini bekler.

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

Ayri terminal:

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

Backend container calisma dizini `/app` oldugu icin varsayilan SQLite ve rapor dosyalari su volume altinda tutulur:

```text
/app/data/berkay-hub.sqlite
/app/data/reports
```

Rapor dosyalarini farkli bir VDS klasorune yazmak istersen backend servisine su ortam degiskeni eklenebilir:

```yaml
environment:
  - BERKAY_HUB_REPORT_DIR=/app/data/reports
```

Google Calendar entegrasyonu icin backend servisine su ortam degiskenleri eklenmelidir:

```yaml
environment:
  - GOOGLE_CALENDAR_CLIENT_ID=...
  - GOOGLE_CALENDAR_CLIENT_SECRET=...
  - GOOGLE_CALENDAR_REDIRECT_URI=http://SUNUCU_IP/api/google-calendar/oauth/callback
  - BERKAY_HUB_GOOGLE_TOKEN_SECRET=uzun-rastgele-secret
  - BERKAY_HUB_FRONTEND_URL=http://SUNUCU_IP/modules/academic-planner/index.html
  - BERKAY_HUB_TIME_ZONE=Europe/Istanbul
```

Frontend `5500:80` portundan yayinlaniyorsa `BERKAY_HUB_FRONTEND_URL` ve Google Cloud origin degeri `http://SUNUCU_IP:5500` seklinde verilmelidir.

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
20260625-google-oauth1
```

Sunucuda yeni kodun servis edildigini kontrol et:

```bash
curl -s http://SUNUCU_IP/ | grep google-oauth1
curl -s "http://SUNUCU_IP/assets/js/api.js?v=20260625-google-oauth1" | grep -E "demo|fallback|admin123|createDemoUser"
```

Beklenen:

- Ilk komut `google-oauth1` gostermeli.
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

Rapor dosyasi upload akisi kontrolu:

```bash
rg -n "multipart/form-data|reportFile|saveUploadedReportFile|BERKAY_HUB_REPORT_DIR" .
```

Google Calendar backend akisi kontrolu:

```bash
rg -n "google-calendar|GoogleCalendar|BERKAY_HUB_GOOGLE_TOKEN_SECRET|GOOGLE_CALENDAR_REDIRECT_URI" .
```

Google Calendar manuel dogrulama:

```bash
curl -s http://localhost:8080/api/google-calendar/status \
  -H "Authorization: Bearer TOKEN"
```

Beklenen:

- Google ortam degiskenleri eksikse `configured: false` donmeli.
- Ortam degiskenleri verildikten sonra `configured: true` donmeli.
- Takvim sekmesindeki `Yetkilendir` butonu Google consent ekranina yonlendirmeli.
- Callback sonrasi `/modules/academic-planner/index.html?googleCalendar=connected` donusu alinmali ve baglanti durumu `Bagli` gorunmeli.
- Akademik etkinlik senkronu ayni etkinligi tekrar gonderirken yeni kopya olusturmak yerine Google event kaydini guncellemelidir.

## Bilinen Notlar ve Sonraki Isler

### 1. Oncelik: Google Takvim Entegrasyonu

Bu onceligin ilk backend OAuth fazi tamamlandi.

Tamamlananlar:

- Frontend-only Google token akisi backend tabanli OAuth akisina alindi.
- Google OAuth callback endpointi backend'e eklendi.
- Kullanici bazli Google refresh token saklama modeli kuruldu.
- Refresh tokenlar duz metin saklanmaz; `BERKAY_HUB_GOOGLE_TOKEN_SECRET` ile AES-GCM sifreleme kullanilir.
- Her uye kendi Google Calendar hesabini Berkay Hub hesabina baglayabilir.
- Admin, uyelerin takvim baglanti durumunu gorebilir ancak kullanici izni olmadan takvim verisini okuyamaz.
- Akademik etkinlikler Google Calendar etkinligine donusturulur ve tekrar senkronlandiginda mevcut Google event kaydi patch edilir.
- Kulup gorevleri icin tarih araligi verilerek Google Calendar etkinligi olusturan backend endpointi eklendi.
- Google Calendar'dan gelen yaklasan etkinlikler Berkay Hub ekraninda okunur.
- Akademik etkinliklerle temel cakisma uyarisi eklendi.
- Token suresi doldugunda refresh token ile otomatik yenileme yapilir; hata baglanti kaydinda tutulur.
- VDS/domain ortaminda Google Cloud `Authorized JavaScript origins` ve `Authorized redirect URIs` ornekleri README'ye eklendi.
- Google token sifreleme icin backend testi ve manuel dogrulama adimlari eklendi.

Kalanlar:

- Ders programi saatleri backend'de kalici olmadigi icin Google etkinlikleriyle ders saatleri arasinda tam cakisma analizi henuz yapilmadi.
- Google API cagri katmani icin mock Google API controller/service testleri genisletilmeli.
- Google Calendar'dan gelen etkinliklerin Berkay Hub icinde kalici kopyasi tutulacaksa ek tablo ve sync state modeli tasarlanmali.
- Uretim icin secret rotation ve mevcut sifreli tokenlarin yeni secret'a tasinma akisi dokumante edilmeli.

### 2. Kulup, Gorev ve Rapor Akisi

- Rapor dosyasi upload boyut limiti belirlenmeli.
- Kabul edilen dosya tipleri netlestirilmeli. Ornek: PDF, DOCX, XLSX, PNG, JPG, ZIP.
- Yuklenen dosyalar icin virus/malware tarama veya en azindan MIME/uzanti kontrolu eklenmeli.
- Rapor dosyalarina admin icin tarayici icinde onizleme ozelligi eklenebilir.
- Red edilen rapor icin admin red nedeni yazabilmeli; bu not uye bildiriminde gorunmeli.
- Rapor versiyonlama eklenebilir. Uye reddedilen rapor icin yeni dosya yukleyebilir.
- Gorevlerde son teslim tarihi, durum ve yorum akisi eklenmeli.
- Bildirimler icin okunmamis filtre, tumunu okundu yap ve sayfalama eklenmeli.
- Bildirimlerin anlik gelmesi icin polling, Server-Sent Events veya WebSocket degerlendirilmeli.

### 3. Rol ve Yetki Modeli

- Backend rol modeli su an `USER` ve `ADMIN` temelli. Detayli kulup rolleri backend'e kalici olarak eklenmeli.
- Takim uyesi, takim kaptani, departman baskani gibi roller icin yetki matrisi olusturulmali.
- Rol atama endpointleri audit log tutmali.
- Varsayilan admin sifresi uretimde degistirilmeli.
- Kendi admin yetkisini kaldirma ve son admini silme gibi senaryolar backend tarafinda daha guclu korunmali.

### 4. VDS, Guvenlik ve Operasyon

- Domain alindiktan sonra HTTPS icin Nginx + Let's Encrypt kurulmali.
- Rapor klasoru icin duzenli yedekleme plani yapilmali.
- SQLite yedegi ve volume snapshot akisi dokumante edilmeli.
- VDS'de `target/` derleme ciktisi GitHub'a pushlanmamalidir.
- Log dosyalari ve hata izleme icin merkezi logging dusunulmeli.
- Docker Compose icin production `.env` dosyasi eklenmeli.

### 5. Test ve Kalite

- Backend icin controller/service testleri eklenmeli.
- Rapor upload/download yetki testleri yazilmali.
- Admin kabul/red akisi test edilmeli.
- Frontend icin Playwright smoke testleri eklenebilir.
- Google Calendar entegrasyonu icin mock Google API testleri hazirlanmali.
