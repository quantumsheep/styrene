window.Prism = window.Prism || {}
window.Prism.manual = true

if (navigator.platform.startsWith('Mac')) {
  document.getElementById('save-shortcut').innerText = 'Command+S'
}

void async function () {
  function bytes_to_base64(bytes) {
    let base64 = ''
    const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    const byteLength = bytes.byteLength
    const byteRemainder = byteLength % 3
    const mainLength = byteLength - byteRemainder

    let a, b, c, d
    let chunk

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63               // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
      chunk = bytes[mainLength]

      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4 // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2 // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
  }

  class Editor {
    constructor() {
      this.source = document.getElementById('source')
      this.compile_button = document.getElementById('compile')
      this.pdf_container = document.getElementById('pdf')

      this.filelist = document.getElementById('filelist')
      this.addfile_button = document.getElementById('addfile')

      this.init_files()
      this.init_current()

      if (!this.current) {
        Editor.get_example('simple.tex').then(data => {
          this.set_file('Article', {
            data,
            set_current: true,
          })
        })
      } else {
        this.set_current(this.current)
      }

      this.update_filelist()

      this.compile_button.addEventListener('click', (e) => {
        e.preventDefault()

        this.set_file(this.current, {
          data: this.source.value
        })

        this.compile()
      })

      this.addfile_button.addEventListener('click', (e) => {
        e.preventDefault()
        this.set_file(`New file ${this.files.filter(f => f.name.startsWith('New file')).length}`)
      })

      hotkeys.filter = () => true
      hotkeys('ctrl+s, command+s', {
        element: this.source,
      }, (e, handler) => {
        e.preventDefault()

        this.set_file(this.current, {
          data: this.source.value
        })

        this.compile()

        return false
      })
    }

    async compile() {
      const res = await fetch('/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: this.source.value,
        }),
      })

      const buffer = await res.arrayBuffer()
      const bytes = new Uint8Array(buffer)

      if (!bytes || (bytes.length === 1 && bytes[0] === 0x0)) {
        Toastify({
          text: 'LaTeX Syntax Error.',
          duration: 3000,
          close: true,
          gravity: 'top',
          position: 'right',
          backgroundColor: 'linear-gradient(to right, #ed213a, #93291e)',
          stopOnFocus: true,
          className: 'toast'
        }).showToast();
      } else {
        const base64 = bytes_to_base64(bytes)

        const embed = document.createElement('embed')
        embed.name = 'pdf-embed'
        embed.title = 'output.pdf'
        embed.src = `data:application/pdf;base64,${base64}`
        embed.classList.add('form-control')

        this.remove_embed_pdf()
        this.pdf_container.appendChild(embed)
      }
    }

    remove_embed_pdf() {
      while (this.pdf_container.firstChild) {
        this.pdf_container.removeChild(this.pdf_container.firstChild)
      }
    }

    static async get_example(name) {
      try {
        return await fetch(`/examples/${name}`).then(res => res.text())
      } catch (e) {
        console.error(e)
      }

      return ''
    }

    update_filelist() {
      while (this.filelist.firstChild) {
        this.filelist.removeChild(this.filelist.firstChild)
      }

      for (const file of this.files) {
        const tab = document.createElement('div')
        tab.innerText = file.name

        if (file.name === this.current) {
          tab.classList.add('selected')
        }

        tab.addEventListener('click', (e) => {
          e.preventDefault()
          this.set_current(file.name)
        })

        this.filelist.appendChild(tab)
      }
    }

    init_files() {
      this.files = []

      try {
        const files = JSON.parse(localStorage.getItem('files'))
        if (Array.isArray(files)) {
          this.files = files
        }
      } catch (e) { }
    }

    init_current() {
      this.current = localStorage.getItem('current')
    }

    set_file(name, config = {
      data: '',
      set_current: true,
    }) {
      const file = this.files.find(f => f.name === name)
      if (file) {
        file.data = config.data
      } else {
        this.files.push({
          name,
          data: config.data,
        })
      }

      if (config.set_current) {
        this.set_current(name)
      }

      this.save_files()
      this.update_filelist()
    }

    set_current(name) {
      if (this.current) {
        this.set_file(this.current, {
          data: source.value,
          set_current: false,
        })
      }

      this.current = name
      localStorage.setItem('current', name)
      this.source.value = this.files.find(f => f.name === name).data
      this.source.dispatchEvent(new Event('input'))
      this.update_filelist()
      this.remove_embed_pdf()

      if (this.source.value) {
        this.compile()
      }
    }

    save_files() {
      localStorage.setItem('files', JSON.stringify(this.files))
    }
  }

  const editor = new Editor()
}()
