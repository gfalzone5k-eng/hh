import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://ftgtvpkmuucjccjxhfxs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z3R2cGttdXVjamNjanhoZnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTQ1NDMsImV4cCI6MjA4NzQzMDU0M30.78OFQ0tfqvVvBcMhZ3rFAsO-oar3o4yAVKZrzc3zldk'
const supabase = createClient(supabaseUrl, supabaseKey)

let prodotti = []
let carrello = []

async function caricaProdotti() {
  const { data, error } = await supabase
    .from('articoli')
    .select('*')
    .order('codice_articolo', { ascending: true })

  if (error) {
    console.error('Errore Supabase:', error)
    document.getElementById('prodotti').innerHTML = '<p>Errore nel caricamento articoli.</p>'
    return
  }

  prodotti = data || []
  mostraProdotti(prodotti)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function mostraProdotti(lista) {
  const container = document.getElementById('prodotti')
  container.innerHTML = ''

  if (!lista.length) {
    container.innerHTML = '<div class="product-card">Nessun articolo trovato.</div>'
    return
  }

  lista.forEach(prod => {
    const codice = String(prod.codice_articolo ?? '')
    const descrizione = String(prod.descrizione ?? '')

    const div = document.createElement('div')
    div.className = 'product-card'
    div.innerHTML = `
      <strong>${escapeHtml(codice)}</strong>
      <div>${escapeHtml(descrizione)}</div>

      <div class="product-actions">
        <input type="number" min="1" value="1" class="qty-input" id="q-${escapeForId(codice)}">
        <button type="button" data-codice="${escapeHtml(codice)}">Aggiungi</button>
      </div>
    `

    const button = div.querySelector('button')
    button.addEventListener('click', () => aggiungi(codice))

    container.appendChild(div)
  })
}

function escapeForId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_')
}

document.getElementById('search').addEventListener('input', function (e) {
  const valore = e.target.value.toLowerCase().trim()

  if (valore === '') {
    mostraProdotti(prodotti)
    return
  }

  const parole = valore.split(/\s+/)

  const filtrati = prodotti.filter(function (p) {
    const testoCompleto = (
      String(p.codice_articolo ?? '') + ' ' +
      String(p.descrizione ?? '')
    ).toLowerCase()

    return parole.every(parola => testoCompleto.includes(parola))
  })

  mostraProdotti(filtrati)
})

function aggiungi(codice) {
  const prodotto = prodotti.find(p => String(p.codice_articolo) === String(codice))
  if (!prodotto) return

  const qtyInput = document.getElementById(`q-${escapeForId(codice)}`)
  const quantita = Math.max(1, parseInt(qtyInput?.value, 10) || 1)

  const esistente = carrello.find(p => String(p.codice_articolo) === String(codice))

  if (esistente) {
    esistente.quantita += quantita
  } else {
    carrello.push({ ...prodotto, quantita })
  }

  aggiornaCarrello()
}

function aggiornaCarrello() {
  const div = document.getElementById('carrello')
  div.innerHTML = ''

  if (carrello.length === 0) {
    div.innerHTML = '<p class="empty-state">Il carrello è vuoto.</p>'
    return
  }

  carrello.forEach(p => {
    const codice = String(p.codice_articolo ?? '')
    const descrizione = String(p.descrizione ?? '')

    const item = document.createElement('div')
    item.className = 'cart-item'
    item.innerHTML = `
      <div class="cart-item-info">
        <strong>${escapeHtml(codice)}</strong><br>
        ${escapeHtml(descrizione)}<br>
        Quantità: ${escapeHtml(p.quantita)}
      </div>
      <button type="button">❌</button>
    `

    item.querySelector('button').addEventListener('click', () => rimuovi(codice))
    div.appendChild(item)
  })
}

function rimuovi(codice) {
  carrello = carrello.filter(p => String(p.codice_articolo) !== String(codice))
  aggiornaCarrello()
}

document.getElementById('inviaOrdine').addEventListener('click', function () {
  const sede = document.getElementById('sede').value.trim()
  const descrizioneOrdine = document.getElementById('descrizioneOrdine').value.trim()

  if (!sede) {
    alert("Inserisci la sede prima di inviare l'ordine")
    return
  }

  if (carrello.length === 0) {
    alert('Carrello vuoto')
    return
  }

  let testo = ''

  carrello.forEach(p => {
    testo += `${String(p.codice_articolo)} - ${p.descrizione} - Quantità: ${p.quantita}\n`
  })

  const templateParams = {
    message: testo,
    sede: sede,
    descrizione: descrizioneOrdine || 'Nessuna descrizione'
  }

  emailjs.send(
    'service_utzs75y',
    'template_1joanb4',
    templateParams
  )
    .then(function () {
      alert('Ordine inviato con successo ✅')
      carrello = []
      document.getElementById('sede').value = ''
      document.getElementById('password').value = ''
      document.getElementById('descrizioneOrdine').value = ''
      aggiornaCarrello()
      verificaCampi()
      resetTextarea()
    })
    .catch(function (error) {
      alert('Errore invio ordine ❌')
      console.log(error)
    })
})

const sedeInput = document.getElementById('sede')
const passwordInput = document.getElementById('password')
const bottoneInvia = document.getElementById('inviaOrdine')

bottoneInvia.disabled = true

function verificaCampi() {
  const sedeValida = sedeInput.value.trim() !== ''
  const passwordCorretta = passwordInput.value === 'INTO'
  bottoneInvia.disabled = !(sedeValida && passwordCorretta)
}

sedeInput.addEventListener('input', verificaCampi)
passwordInput.addEventListener('input', verificaCampi)

const textarea = document.getElementById('descrizioneOrdine')

function resetTextarea() {
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

document.addEventListener('DOMContentLoaded', () => {
  resetTextarea()

  textarea.addEventListener('input', function () {
    this.style.height = 'auto'
    this.style.height = this.scrollHeight + 'px'
  })
})

caricaProdotti()
aggiornaCarrello()
