const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = ('https://davbfkylsvirirbewboi.supabase.co' || '').replace(/\/$/, '');
const SUPABASE_KEY = 'sb_publishable_Nuq-LraX5BaivEV3NiVAkw_hpBtAvIe' || '';

function send(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  response.end(JSON.stringify(payload));
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL dan SUPABASE_ANON_KEY belum dikonfigurasi.');
  }
  const headers = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const result = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  const text = await result.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!result.ok) throw new Error(body?.message || body?.hint || 'Permintaan Supabase gagal.');
  return body;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('JSON tidak valid.')); }
    });
    request.on('error', reject);
  });
}

function amount(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

async function createTrip(data) {
  if (!data.pelanggan_id || !data.tanggal_perjalanan || !data.rute || !data.kendaraan || !data.nama_driver) {
    throw new Error('Data pelanggan, tanggal, rute, kendaraan, dan driver wajib diisi.');
  }
  const trip = {
    pelanggan_id: data.pelanggan_id,
    tanggal_perjalanan: data.tanggal_perjalanan,
    rute: data.rute,
    kendaraan: data.kendaraan,
    nama_driver: data.nama_driver,
    status: data.status || 'terjadwal',
    nilai_sewa: amount(data.nilai_sewa),
    diskon: amount(data.diskon),
    dp: amount(data.dp),
    bensin_aktual: amount(data.bensin_aktual),
    tol: amount(data.tol),
    parkir: amount(data.parkir),
    komisi_driver: amount(data.komisi_driver),
    status_penggantian: data.status_penggantian || 'belum_diganti',
    catatan: data.catatan || null
  };
  const inserted = await supabaseRequest('perjalanan_sewa', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(trip)
  });
  const created = inserted[0];
  if (trip.dp > 0) {
    await supabaseRequest('kas', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        perjalanan_id: created.id,
        tanggal_transaksi: trip.tanggal_perjalanan,
        jenis: 'pemasukan',
        kategori: 'dp_sewa',
        keterangan: `DP sewa ${trip.rute}`,
        jumlah: trip.dp,
        metode_pembayaran: data.metode_dp || 'tunai'
      })
    });
  }
  return created;
}

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === 'OPTIONS') return send(response, 204, {});
  try {
    if (request.method === 'GET' && url.pathname === '/api/dashboard') {
      const [trips, cash, customers] = await Promise.all([
        supabaseRequest('perjalanan_sewa?select=*,pelanggan(nama)&order=tanggal_perjalanan.desc'),
        supabaseRequest('kas?select=*&order=tanggal_transaksi.desc'),
        supabaseRequest('pelanggan?select=*&order=nama.asc')
      ]);
      return send(response, 200, { trips, cash, customers });
    }
    if (request.method === 'POST' && url.pathname === '/api/customers') {
      const data = await readBody(request);
      if (!data.nama) throw new Error('Nama pelanggan wajib diisi.');
      const created = await supabaseRequest('pelanggan', {
        method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(data)
      });
      return send(response, 201, created[0]);
    }
    if (request.method === 'POST' && url.pathname === '/api/trips') {
      return send(response, 201, await createTrip(await readBody(request)));
    }
    if (request.method === 'POST' && url.pathname === '/api/cash') {
      const data = await readBody(request);
      if (!data.keterangan || !data.kategori || amount(data.jumlah) <= 0) throw new Error('Keterangan, kategori, dan jumlah wajib diisi.');
      const created = await supabaseRequest('kas', {
        method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...data, jumlah: amount(data.jumlah) })
      });
      return send(response, 201, created[0]);
    }
    return send(response, 404, { error: 'Rute tidak ditemukan.' });
  } catch (error) {
    return send(response, 400, { error: error.message });
  }
}

http.createServer(route).listen(PORT, () => {
  console.log(`Shabila Trans API berjalan di http://localhost:${PORT}`);
});
