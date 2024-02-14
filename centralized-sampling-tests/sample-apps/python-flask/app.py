import os

from flask import Flask, request

application = app = Flask(__name__)

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.util.types import Attributes

resourceAttr = {
    ResourceAttributes.SERVICE_NAME: "adot-integ-test",
    ResourceAttributes.CLOUD_PLATFORM: "aws_ec2",
}
resource = Resource.create(attributes=resourceAttr)
###
### Set sampler HERE
###
tracer = trace.get_tracer(__name__)


def get_sampled_span_count(name, total_spans, attributes):
    tracer = trace.get_tracer(name)
    sampled_count = 0
    total_samples = int(total_spans)
    for i in range(0, total_samples):
        with tracer.start_as_current_span("Root Span", attributes=attributes, kind=trace.SpanKind.SERVER) as parent:
            if parent.get_span_context().trace_flags.sampled:
                sampled_count += 1
    return sampled_count

@app.route('/importantEndpoint')
def callHTTP():
    serviceName = request.headers.get("Service_name")
    totalSpans = request.headers.get("Totalspans")
    span_attributes: Attributes = {
        "http.request.method": "GET",
        "url.full": "http://localhost:8080/importantEndpoint",
        "user": request.headers.get("User"),
        "http.route": "/importantEndpoint",
        "required": request.headers.get("Required"),
        "url.path": "/importantEndpoint"
    }

    return str(get_sampled_span_count(serviceName, totalSpans, span_attributes))


# test aws sdk instrumentation
@app.route('/getSampled', methods = ['GET', 'POST'])
def callAWSSDK():
    serviceName = request.headers.get("Service_name")
    totalSpans = request.headers.get("Totalspans")
    span_attributes: Attributes = {
        "http.request.method": request.method.upper(),
        "url.full": "http://localhost:8080/getSampled",
        "user": request.headers.get("User"),
        "http.route": "/getSampled",
        "required": request.headers.get("Required"),
        "url.path": "/getSampled"
    }

    return str(get_sampled_span_count(serviceName, totalSpans, span_attributes))

# test flask-sql alchemy instrumentation
@app.route('/flask-sql-alchemy-call')
def callSQL():
    return 'Ok! tracing sql call'

@app.route('/')
def default():
    return "healthcheck"

if __name__ == "__main__":
    address = os.environ.get('LISTEN_ADDRESS')

    if address is None:
        host = '0.0.0.0'
        port = '8080'
    else:
        host, port = address.split(":")
    app.run(host=host, port=int(port), debug=True)