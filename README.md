![](https://github.com/quantumsheep/styrene/blob/master/resources/logo.png)

# Styrene
Write and Compile LaTeX in the browser.

# Self-hosting
## Docker
```bash
docker run -d --name=styrene -p 8080:8080 quantumsheep/styrene
```

See [quantumsheep/styrene](https://hub.docker.com/r/quantumsheep/styrene) image for further information.

### Why is the image so heavy?
We use [`texlive`](https://pkgs.alpinelinux.org/package/edge/community/x86/texlive) alpine package to run `pdflatex` with all the LaTeX packages needed, which are very large because of all the dependencies and sub packages used.

## From sources
First, clone the repository to the specified directory and install the required `npm` modules.
```bash
git clone https://github.com/quantumsheep/styrene
cd styrene
npm install
```

To start the server, use the `start` script.
```bash
npm start
```

# Screenshots
Because pictures speak louder than words.

![](https://i.imgur.com/RP5UnbO.png)
![](https://i.imgur.com/foBjSP8.png)
