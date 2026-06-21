# Berkay Hub - Kapsamlı Proje Geliştirme ve Mimari Planı

Bu döküman, Merkezi Hub ve Kulüp Yönetim Sistemi'nin vizyonunu, klasör hiyerarşisini, dosya işlevlerini ve adım adım geliştirme süreçlerini içermektedir.

## 1. Proje Özeti ve Strateji

Tüm projeleri tek bir "çöplük" reposunda toplamak yerine, profesyonel bir portfolyo görünümü ve kolay yönetim için "Her Projeye Ayrı Repo" (Çoklu Repo) stratejisi benimsenmiştir. Berkay Hub, "Tek Sorumluluk" (Single Responsibility) ilkesine dayanarak projelerin birbirine karıştırılmadığı, bağımsız servisler olarak çalıştığı bir Merkezi Portal mimarisidir.

---

## 2. Dosya Hiyerarşisi (Folder Structure)

Projenin önyüz (frontend) iskeleti aşağıdaki gibi yapılandırılmıştır:

```text
central-hub-frontend/
├── index.html                        # Ana Giriş Paneli (Berkay Hub)
├── README.md                         # Proje Planı ve Mimari Dökümantasyon
├── assets/                           # Ortak Statik Kaynaklar
│   ├── css/
│   │   └── style.css                 # Tailwind CSS Konfigürasyonu ve Özel Stiller
│   ├── js/
│   │   ├── main.js                   # Genel UI Etkileşimleri ve Dinamik Efektler
│   │   └── api.js                    # Backend REST API İstek Yönetimi (Fetch)
│   └── images/                       # Logo, İkonlar ve Görsel Varlıklar
└── modules/                          # Bağımsız Çalışan Alt Modüller
    ├── club-management/
    │   └── index.html                # Kulüp Teknik Yönetim Arayüzü
    ├── academic-planner/
    │   └── index.html                # Akademik Planlayıcı Arayüzü
    └── security-cameras/
        └── index.html                # Güvenlik Ağı / Kamera İzleme Arayüzü
```

---

## 3. Dosyaların İşlevleri ve Görev Tanımları

### Merkezi Sistem
* **`index.html`:** Sistemin ana giriş kapısıdır. Kullanıcı doğrulamasının yapıldığı ve yetkiye göre alt sistemlere yönlendiren ana arayüzdür.
* **`assets/css/style.css`:** Projenin görsel kimliğini, Tailwind CSS entegrasyonunu ve özel koyu tema (dark mode) kurallarını barındırır.
* **`assets/js/main.js`:** İstemci taraflı (client-side) etkileşimleri, animasyonları ve Vanilla JS ile yazılmış arayüz mantığını yönetir.
* **`assets/js/api.js`:** Arka uç (Backend) ile ön yüz (Frontend) arasındaki veri köprüsüdür. Java Spring Boot servisleriyle haberleşecek fetch/XHR isteklerinin merkezi olarak tutulduğu dosyadır.

### Alt Modüller
* **`modules/club-management/index.html`:** Raporlama, to-do listeleri ve takım görevlendirmelerinin yönetildiği arayüzdür.
* **`modules/academic-planner/index.html`:** Kişisel ders, program takibi ve akademik etkinliklerin planlandığı arayüzdür.
* **`modules/security-cameras/index.html`:** Laboratuvar izleme amacıyla kurulan, ana sistemi yormaması için ayrı tutulan güvenlik modülü arayüzüdür.

---

## 4. Geliştirme Yol Haritası (Roadmap)

### Faz 1: Temel Mimari ve Frontend (Devam Ediyor)
- [x] Çoklu repo stratejisine karar verilmesi ve planlanması.
- [x] Tek Sorumluluk ilkesine göre modüler klasör iskeletinin tasarlanması.
- [x] Ana Dashboard arayüzünün Tailwind CSS ile, karanlık tema ve yönetici paneli hissiyatıyla kodlanması.
- [ ] Ortak `api.js` ve `main.js` dosyalarının temel yönlendirme mantıklarının yazılması.

### Faz 2: Alt Modüllerin Frontend Geliştirmesi
- [ ] **Kulüp Yönetimi:** Raporlama, to-do listeleri ve takım atamaları arayüzünün HTML/CSS/JS ile kodlanması.
- [ ] **Akademik Planlayıcı:** Dinamik takvim bileşenlerinin entegre edilmesi.
- [ ] **Güvenlik Ağı:** Laboratuvar kamera izleme (sadece admin) için video akış arayüzünün hazırlanması.

### Faz 3: Backend ve Veritabanı Geliştirmesi (Java Spring Boot)
- [ ] Java Spring Boot backend projesinin oluşturulması ve yapılandırılması.
- [ ] Başlangıç için hızlı ve taşınabilir olması adına SQLite veritabanının entegre edilmesi.
- [ ] Spring Security kullanılarak Kullanıcı / Admin yetkilendirmelerinin yapılması.
- [ ] Frontend'in veri çekebileceği REST API uçlarının (endpoints) yazılması.

### Faz 4: Sunucu Kurulumu ve Ağ Yapılandırması (VDS)
- [ ] Mini PC'nin bir VDS'e dönüştürülmesi ve ağa bağlanması.
- [ ] Eduroam ağındaki katı Firewall ve CGNAT yapısını aşmak için Cloudflare Tunnel (veya ngrok) kullanılarak dışarıya (Outbound) güvenli köprü kurulması.
- [ ] Java backend ve statik frontend dosyalarının sunucuya deploy edilmesi.
- [ ] Sunucu CPU, RAM ve Ağ Trafiği metriklerinin canlı izlenebilmesi için sistem entegrasyonu.

### Faz 5: Versiyon Kontrol
- [ ] GitHub CLI (`gh`) kullanılarak reponun oluşturulması ve kodların pushlanması.
- [ ] Derlenmiş dosyalar ve API anahtarları için `.gitignore` kurallarının katı bir şekilde uygulanması.
