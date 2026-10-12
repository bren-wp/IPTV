# IPTV — postavljanje na iptv.icode.com.hr

Ove upute vrijede za gotov ZIP web aplikacije. ZIP je sastavljen tako da **index.html i ostale datoteke budu odmah u korijenu arhive**, bez dodatne mape.

## 1. Priprema hostinga

U administraciji hostinga (npr. cPanel / DirectAdmin / Plesk) izradi poddomenu **iptv.icode.com.hr** i provjeri točan *document root* koji je hosting odredio za tu poddomenu. Ako se DNS-om već upravlja na drugom mjestu, poddomenu usmjeri na IP ili CNAME **koji je stvarno dodijelio tvoj hosting**. Nisu potrebni PHP ni baza podataka.

Ako koristiš vlastiti cPanel/Apache hosting, **ne** postavljaj CNAME na GitHub Pages. GitHub Pages je druga mogućnost opisana u [WEB_HOSTING.md](WEB_HOSTING.md).

## 2. Učitavanje web ZIP-a

1. U File Manageru ili putem SFTP-a otvori *document root* baš za poddomenu `iptv.icode.com.hr`.
2. Učitaj ZIP, raspakiraj ga **izravno u taj direktorij**.
3. Provjeri da se `index.html` nalazi na putanji `<document-root>/index.html`, a ne u `<document-root>/neka-mapa/index.html`.
4. Provjeri da se prenesu i skrivene datoteke `.htaccess` i `.nojekyll`. Ako tvoj hosting nije Apache, pravila iz `.htaccess` treba prenijeti u konfiguraciju njegova web-poslužitelja.
5. Uključi važeći SSL/TLS certifikat za poddomenu i trajno preusmjeri HTTP na HTTPS putem administracije hostinga. Ne isključuj provjeru certifikata.

## 3. Provjera rada

Nakon postavljanja otvori:

- `https://iptv.icode.com.hr/` — aplikacija s logotipom i kanalima.
- `https://iptv.icode.com.hr/catalog.json` — popis kanala.
- `https://iptv.icode.com.hr/api/catalog.json` — javni JSON za integracije.
- `https://iptv.icode.com.hr/api/status.json` — vrijeme posljednje objave, broj kanala i M3U zapisa.
- `https://iptv.icode.com.hr/playlist.m3u` — M3U popis postojećih HTTPS HLS izvora.
- `https://iptv.icode.com.hr/api/playlist.m3u` — isti M3U putem API putanje.

Svi URL-ovi moraju vraćati uspješan HTTP odgovor. JSON datoteke moraju biti čitljiv JSON; M3U mora početi s `#EXTM3U`, a ne s HTML stranicom ili porukom o grešci. Provjeri mobilni prikaz, tipku za povratak, pretraživanje, TV vodič i barem nekoliko stvarnih kanala. Neke izvore blokiraju CORS, DRM, geografska ograničenja ili nedostupni poslužitelji.

## 4. Ažuriranje kanala i playlista

Aplikacija tijekom korištenja provjerava nove podatke približno svakih 15 minuta i čuva posljednji ispravan katalog. GitHubov sinkronizator pokušava osvježiti izvorni katalog svakog sata, no raspored ovisi o dostupnosti GitHub Actionsa.

**Važno:** jednom učitani `catalog.json` i `playlist.m3u` na privatnom hostingu ne mijenjaju se sami. Izaberi jedno od sljedećeg:

- **Automatski vlastiti hosting:** u GitHub Actions postavi varijablu `IPTV_SSH_DEPLOY_ENABLED=true` i tajne `IPTV_SSH_HOST`, `IPTV_SSH_USER`, `IPTV_SSH_PRIVATE_KEY`, `IPTV_SSH_KNOWN_HOSTS` te `IPTV_SSH_REMOTE_DIR`. Tajne i privatne ključeve **nemoj objavljivati u chatu ni u repozitoriju**. Koristi GitHubov workflow **IPTV Self-Hosted Web Deployment**.
- **Automatski GitHub Pages:** ako želiš hosting direktno na GitHubu, koristi workflow **IPTV Public Web Deployment** i postavi domenu preko GitHub Pages postavki.
- **Ručno:** ponovno preuzmi najnoviji web ZIP nakon novih izdanja i zamijeni datoteke na hostingu. Ovo **nije** automatsko osvježavanje javnog M3U-a.

Ako koristiš SSH, web-poslužitelj treba biti dostupan računu s ograničenim pristupom isključivo odredišnoj mapi web-aplikacije. `IPTV_SSH_KNOWN_HOSTS` mora sadržavati prethodno provjeren javni SSH host ključ poslužitelja.

## 5. Najčešći problemi

- **404 na početnoj stranici:** `index.html` je u pogrešnoj mapi ili poddomena pokazuje na drugi document root.
- **Prazan ekran / ne učitava se CSS:** provjeri datoteke u `assets/`, dopuštenja datoteka i HTTP odgovore. Ne mijenjaj nazive datoteka s hash-oznakama.
- **M3U otvara HTML:** hosting preusmjerava nepostojeću datoteku na `index.html` ili M3U nije učitan.
- **Kanal ne radi:** vanjski stream može biti ugašen, DRM-zaštićen, geografski ograničen ili nepodržan na uređaju. Koristi drugu dostupnu verziju streama.
- **SSL upozorenje:** ne zaobilazi sigurnosno upozorenje; prvo ispravi DNS i certifikat.
- **Promjene playliste se ne vide:** provjeri /api/status.json, GitHub workflow, cache na CDN-u i eventualne pogreške SSH-a.

## Produkcijska ograničenja

Ovaj paket je javna web aplikacija i direktorij vanjskih poveznica; **ne sadrži TV videodatoteke**, ne jamči rad svakog izvora i nije dokaz prava na emitiranje. Prije komercijalne objave provjeri licence i prava distribucije, kompatibilnost uređaja i uvjete pružatelja streamova.
