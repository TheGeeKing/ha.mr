FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html 404.html /usr/share/nginx/html/
COPY alphabets.js compress.js main.js qrcode.js standalone.js /usr/share/nginx/html/
