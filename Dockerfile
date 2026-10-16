FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt
COPY . .
ENV FLASK_DEBUG=false
EXPOSE 5000
CMD ["gunicorn", "--workers", "2", "wsgi:app"]
