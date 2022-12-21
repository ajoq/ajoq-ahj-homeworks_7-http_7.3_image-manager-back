const http = require('http');
const Koa = require('koa');
const { koaBody } = require('koa-body');
const koaStatic = require('koa-static');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({
    imagesList: []
}).write();

const app = new Koa();
const public = path.join(__dirname, '/public');

app.use(koaStatic(public));

app.use(koaBody({
    urlencoded: true,
    multipart: true
}));

app.use((ctx, next) => {
    if (ctx.request.method !== 'OPTIONS') {
        next();

        return;
    }

    ctx.response.set('Access-Control-Allow-Origin', '*');
    ctx.response.set('Access-Control-Allow-Methods', 'DELETE, PUT, PATCH, GET, POST');
    ctx.response.status = 204;
});

app.use((ctx) => {
    const { method } = ctx.request.query;

    switch (method) {
        case 'addImage':
            ctx.response.set('Access-Control-Allow-Origin', '*');
                    
            let fileName;
            let arrImages = [];
            let returnImages = [];

            const {images} = ctx.request.files;
            images.length ? arrImages = images : arrImages.push(images);

            arrImages.forEach(file => {
                try {
                    const subfolder = uuidv4();
                    const uploadFolder = public + '/' + subfolder;
                
                    fs.mkdirSync(uploadFolder);
                
                    fs.copyFile(file.filepath, uploadFolder + '/' + file.originalFilename, (err) => {
                        if (err) console.log("Error Found:", err);
                    });
    
                    fileName = '/' + subfolder + '/' + file.originalFilename;
                    ctx.response.status = 200;

                    db.get('imagesList').push({id: subfolder, url: fileName, name: file.originalFilename}).write();
                    returnImages.push({id: subfolder, url: fileName, name: file.originalFilename});

                } catch(error) {
                    ctx.response.status = 500;
                    return;
                }                
            });

            ctx.response.body = returnImages;
            return;
        case 'getImages':
            ctx.response.set('Access-Control-Allow-Origin', '*');
            ctx.response.status = 200;

            ctx.response.body = db.get('imagesList').value();
            return;  
        case 'deleteImage':
            ctx.response.set('Access-Control-Allow-Origin', '*');
            ctx.response.status = 200;

            const deleteFolder = public + '\\' + ctx.request.query.id;
                
            fs.rmSync(deleteFolder, { recursive: true, force: true });

            db.get('imagesList').remove({id: ctx.request.query.id}).write();
            ctx.response.body = db.get('imagesList').value();

            return;
        default:
            ctx.response.status = 404;
            return;
    }
});

const server = http.createServer(app.callback());
const port = 7070;

server.listen(port, (err) => {
    if (err) {
        console.log(err);

        return;
    }

    console.log('Сервер слушает тебя, порт ' + port);
});