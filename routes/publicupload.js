require('dotenv').config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const supabase = require("../config/supabase.js");


const router = express.Router();
// ==============


//supabase upload zip
const compressedUpload = multer({

    storage: multer.memoryStorage(),

    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    },
    fileFilter: (req, file, cb) => {

        const extensoes = [
            ".zip",
            ".rar",
            ".md",
            ".txt",
            ".markdown",
            ".pdf",
            ".img",
            ".jpg",
            ".png",
            ".jpeg"
        ];
        if (extensoes.includes(
            path.extname(file.originalname).toLowerCase()
        )) {
            return cb(null, true);
        }
        cb(new Error("Apenas arquivos ZIP, RAR, PDF, JPEG, JPG, PNG"));
    }
});


router.post(
"/upload/zip", compressedUpload.single("arquivo"),
async (req, res) => {
    try {
        const agora = new Date();
        const nomeArquivo =
            `${agora.getFullYear()}-` +
            `${String(agora.getMonth()+1).padStart(2,'0')}-` +
            `${String(agora.getDate()).padStart(2,'0')}_` +
            `${String(agora.getHours()).padStart(2,'0')}-` +
            `${String(agora.getMinutes()).padStart(2,'0')}-` +
            `${String(agora.getSeconds()).padStart(2,'0')}_` +
            `${req.file.originalname}`;

        const { data, error } =
        await supabase.storage

        .from("upload")
        .upload(
            `zip/${nomeArquivo}`,
            req.file.buffer,
            {
                contentType: req.file.mimetype
            }
        );

        if(error){
            throw error;
        }

        const url =
        supabase.storage
        .from("zip")
        .getPublicUrl(data.path);

        res.json({
            sucesso: true,
            arquivo: nomeArquivo,
            url: url.data.publicUrl

        });

    } catch(err) {

        res.status(500).json({
            sucesso:false,
            erro:err.message
        });

    }
});



module.exports = router 