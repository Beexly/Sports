import asyncio
import logging
import urllib.request

import cv2
import dlib
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from insightface.app import FaceAnalysis
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, ContextTypes

BOT_TOKEN = "8820744795:AAENsPj3AqqQg3Md-O8O0MG7mJkh__oMitQ"

# Initialize MediaPipe Face Detector (Tasks API)
base_options = python.BaseOptions(model_asset_path=None)
# Fallback Haar Cascade or Tasks API for MediaPipe
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

detector = dlib.get_frontal_face_detector()
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=-1, det_size=(640, 640))

logging.basicConfig(level=logging.INFO)


def count_faces(image_bytes: bytes):
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # OpenCV / MediaPipe detection
    faces_cv = face_cascade.detectMultiScale(gray, 1.1, 4)
    mp_n = len(faces_cv)

    dl_n = len(detector(gray))

    ar_n = len(app.get(rgb))

    return mp_n, dl_n, ar_n


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Facial Recognition Bot. Send a photo.")


async def on_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    data = urllib.request.urlopen(file.file_url).read()
    mp_n, dl_n, ar_n = count_faces(data)
    reply = (
        f"MediaPipe/Cascade: {mp_n}\n"
        f"Dlib: {dl_n}\n"
        f"ArcFace: {ar_n}"
    )
    await update.message.reply_text(reply)


def main():
    app_tg = Application.builder().token(BOT_TOKEN).build()
    app_tg.add_handler(CommandHandler("start", cmd_start))
    app_tg.add_handler(MessageHandler(lambda u: u.photo, on_photo))
    app_tg.run_polling()


if __name__ == "__main__":
    main()
