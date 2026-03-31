import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://ftgtvpkmuucjccjxhfxs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z3R2cGttdXVjamNjanhoZnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTQ1NDMsImV4cCI6MjA4NzQzMDU0M30.78OFQ0tfqvVvBcMhZ3rFAsO-oar3o4yAVKZrzc3zldk'
const supabase = createClient(supabaseUrl, supabaseKey)

let prodotti = []
let carrello = []

// ----------------------
// CARICA ARTICOLI
// ----------------------
async function caricaProdotti() {

  const { data, error } = await supabase
    .from('articoli')
    .select('*')

  if (error) {
    console.error("Errore Supabase:", error)
    return
  }

  prodotti = data || []
  mostraProdotti(prodotti)
}

// ----------------------
// MOSTRA PRODOTTI
// ----------------------
function mostraProdotti(lista) {

  const container = document.getElementById('prodotti')
  container.innerHTML = ''

  lista.forEach(prod => {

    const codice = String(prod.codice_articolo ?? '')
    const descrizione = String(prod.descrizione ?? '')

    const div = document.createElement('div')
    div.className = 'product-card'
    div.innerHTML = `
      <strong>${codice}</strong><br>
      ${descrizione}<br><br>
      <input type="number" min="1" value="1" class="qty-input" id="q-${codice}">
      <button onclick="aggiungi('${codice}')">Aggiungi</button>
    `
    container.appendChild(div)
  })
}

// ----------------------
// RICERCA
// ----------------------
document.getElementById('search').addEventListener('input', function(e) {

  const valore = e.target.value
    .toLowerCase()
    .trim()

  if (valore === "") {
    mostraProdotti(prodotti)
    return
  }

  const parole = valore.split(/\s+/)

  const filtrati = prodotti.filter(function(p) {

    const testoCompleto = (
      String(p.codice_articolo ?? '') + " " +
      String(p.descrizione ?? '')
    ).toLowerCase()

    return parole.every(parola =>
      testoCompleto.includes(parola)
    )
  })

  mostraProdotti(filtrati)
})

// ----------------------
// AGGIUNGI AL CARRELLO
// ----------------------
window.aggiungi = function(codice) {

  const prodotto = prodotti.find(p => 
    String(p.codice_articolo) === String(codice)
  )

  if (!prodotto) return

  const quantita = parseInt(document.getElementById(`q-${codice}`).value) || 1

  const esistente = carrello.find(p =>
    String(p.codice_articolo) === String(codice)
  )

  if (esistente) {
    esistente.quantita += quantita
  } else {
    carrello.push({ ...prodotto, quantita })
  }

  aggiornaCarrello()
}

// ----------------------
// AGGIORNA CARRELLO
// ----------------------
function aggiornaCarrello() {

  const div = document.getElementById('carrello')
  div.innerHTML = ''

  carrello.forEach(p => {

    const codice = String(p.codice_articolo)
    const descrizione = String(p.descrizione)

    div.innerHTML += `
      <div class="cart-item">
        ${descrizione} x ${p.quantita}
        <button onclick="rimuovi('${codice}')">❌</button>
      </div>
    `
  })
}

// ----------------------
// RIMUOVI
// ----------------------
window.rimuovi = function(codice) {

  carrello = carrello.filter(p =>
    String(p.codice_articolo) !== String(codice)
  )

  aggiornaCarrello()
}

// ----------------------
// INVIA ORDINE
// ----------------------
document.getElementById('inviaOrdine').addEventListener('click', function() {

  const sede = document.getElementById('sede').value.trim()
  const descrizioneOrdine = document.getElementById('descrizioneOrdine').value.trim()

  if (!sede) {
    alert("Inserisci la sede prima di inviare l'ordine")
    return
  }

  if (carrello.length === 0) {
    alert("Carrello vuoto")
    return
  }

  let testo = ""

  carrello.forEach(p => {
    testo += `${String(p.codice_articolo).padEnd(14)} - ${p.descrizione} - Quantità: ${p.quantita}\n`
  })

  const templateParams = {
    message: testo,
    sede: sede,
    descrizione: descrizioneOrdine || "Nessuna descrizione"
  }

  emailjs.send(
    "service_utzs75y",
    "template_1joanb4",
    templateParams
  )
  .then(function() {
    alert("Ordine inviato con successo ✅")
    carrello = []
    document.getElementById('sede').value = ""
    aggiornaCarrello()
  })
  .catch(function(error) {
    alert("Errore invio ordine ❌")
    console.log(error)
  })

})

// ----------------------
// BLOCCO CONTROLLO SEDE
// ----------------------
const sedeInput = document.getElementById('sede')
const passwordInput = document.getElementById('password')
const bottoneInvia = document.getElementById('inviaOrdine')

bottoneInvia.disabled = true

function verificaCampi() {
  const sedeValida = sedeInput.value.trim() !== ""
  const passwordCorretta = passwordInput.value === "INTO"

  bottoneInvia.disabled = !(sedeValida && passwordCorretta)
}

sedeInput.addEventListener('input', verificaCampi)
passwordInput.addEventListener('input', verificaCampi)

// ----------------------
// AUTO-RESIZE TEXTAREA
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('descrizioneOrdine')

  textarea.style.height = textarea.scrollHeight + 'px'

  textarea.addEventListener('input', function () {
    this.style.height = 'auto'
    this.style.height = this.scrollHeight + 'px'
  })
})

// ----------------------
caricaProdotti()
