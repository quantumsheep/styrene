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

  function toast(type, text) {
    let background_color = '#fff'

    switch (type) {
      case 'error':
        background_color = 'linear-gradient(to right, #ed213a, #93291e)'
        break
    }

    Toastify({
      text,
      duration: 3000,
      close: true,
      gravity: 'top',
      position: 'right',
      backgroundColor: background_color,
      stopOnFocus: true,
      className: 'toast'
    }).showToast()
  }

  class Editor {
    constructor() {
      this.source = document.getElementById('source')
      this.compile_button = document.getElementById('compile')
      this.pdf_container = document.getElementById('pdf')

      this.filelist = document.getElementById('filelist')
      this.addfile_button = document.getElementById('addfile')

      this.filelist_editing_tags = []

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
        toast('error', 'LaTeX Syntax Error.')
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
        if (this.filelist_editing_tags.includes(file.name)) {
          const tab = document.createElement('form')
          tab.classList.add('tab')

          const fake_submit = document.createElement('button')
          fake_submit.type = 'submit'
          fake_submit.hidden = true
          tab.appendChild(fake_submit)

          const input = document.createElement('input')
          input.value = file.name

          const buttons = document.createElement('span')
          buttons.classList.add('tab-buttons')

          const submit_btn = document.createElement('img')
          submit_btn.src = '/static/enter-arrow.svg'
          submit_btn.addEventListener('click', (e) => {
            fake_submit.click()
          })

          buttons.appendChild(submit_btn)

          tab.appendChild(input)
          tab.appendChild(buttons)

          tab.addEventListener('submit', (e) => {
            e.preventDefault()

            if (!input.value) {
              toast('error', "The file's name should not be empty.")
              return false;
            }

            if (this.files.find(f => f !== file && f.name === input.value)) {
              toast('error', 'Another tab already have this name.')
              return false;
            }

            this.filelist_editing_tags = this.filelist_editing_tags.filter(tag => tag !== file.name)

            const tmp = file.name
            file.name = input.value

            if (this.current == tmp) {
              this.set_current(file.name)
            } else {
              this.update_filelist()
            }

            this.save_files()
          })

          if (file.name === this.current) {
            tab.classList.add('selected')
          }

          this.filelist.appendChild(tab)
        } else {
          const tab = document.createElement('div')
          tab.classList.add('tab')

          const name = document.createElement('span')
          name.innerText = file.name
          name.classList.add('tab-title')

          const buttons = document.createElement('span')
          buttons.classList.add('tab-buttons')

          const edit_btn = document.createElement('img')
          edit_btn.src = '/static/edit.svg'
          edit_btn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()

            this.filelist_editing_tags.push(file.name)
            this.update_filelist()
          })

          const delete_btn = document.createElement('img')
          delete_btn.src = '/static/delete.svg'
          delete_btn.addEventListener('click', (e) => {
            if (this.current === file.name) {
              let next = this.files.findIndex(f => f.name == this.current) + 1

              if (this.files.length > next) {
                next = Math.max(this.files.length - 1, 0)
              }

              if (this.files.length > next) {
                this.set_current(this.files[next].name)
              } else {
                localStorage.removeItem('current')
                this.set_source('')
                this.remove_embed_pdf()
              }
            }

            this.files = this.files.filter(f => f.name !== file.name)
            this.save_files()
            this.update_filelist()
          })

          buttons.appendChild(edit_btn)
          buttons.appendChild(delete_btn)

          tab.appendChild(name)
          tab.appendChild(buttons)

          tab.addEventListener('click', (e) => {
            if (e.target !== tab && e.target !== name) {
              return false;
            }

            e.preventDefault()
            this.set_current(file.name)
          })

          if (file.name === this.current) {
            tab.classList.add('selected')
          }

          this.filelist.appendChild(tab)
        }
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
      this.current = name
      localStorage.setItem('current', name)

      const file = this.files.find(f => f.name === name)
      if (file) {
        this.set_source(file.data)
      }

      this.update_filelist()
      this.remove_embed_pdf()

      if (this.source.value) {
        this.compile()
      }
    }

    set_source(value) {
      this.source.value = value
      this.source.dispatchEvent(new Event('input'))
    }

    save_files() {
      localStorage.setItem('files', JSON.stringify(this.files))
    }
  }

  const editor = new Editor()
}()
