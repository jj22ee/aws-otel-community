FROM python:3.11.0

WORKDIR /app

COPY . ./

RUN pip install -r requirements.txt

EXPOSE 8080

CMD ["python3", "app.py"]
# CMD [ "python3", "app.py", "--host=127.0.0.1"]