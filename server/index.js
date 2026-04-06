const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de Nodemailer (Aprenderemos a usar Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu correo
    pass: process.env.EMAIL_PASS, // Tu "Contraseña de Aplicación"
  },
});

app.post('/api/send-reminder', (req, res) => {
  const { to, subject, message } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error al enviar mail:', error);
      return res.status(500).json({ error: error.toString() });
    }
    console.log('Correo enviado con éxito:', info.response);
    res.status(200).json({ message: 'Correo enviado!' });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor de aprendizaje corriendo en puerto ${PORT}`);
});
