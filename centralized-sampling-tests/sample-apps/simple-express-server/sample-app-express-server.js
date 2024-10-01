'use strict';

const { SpanKind, TraceFlags, context } = require('@opentelemetry/api');
const { 
  NodeTracerProvider,
  AlwaysOnSampler
} = require('@opentelemetry/sdk-trace-node');
const express = require('express');
const process = require('process');
const opentelemetry = require("@opentelemetry/sdk-node");
const { Resource } = require("@opentelemetry/resources");
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_CLOUD_PLATFORM } = require("@opentelemetry/semantic-conventions");
const { BatchSpanProcessor, ConsoleSpanExporter} = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { AWSXRayPropagator } = require("@opentelemetry/propagator-aws-xray");
const { AWSXRayIdGenerator } = require("@opentelemetry/id-generator-aws-xray");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { AwsInstrumentation } = require("@opentelemetry/instrumentation-aws-sdk");
const { AwsXRayRemoteSampler } = require("<XRay Sampler Reference Here>")

const _resource = Resource.default().merge(new Resource({
        [SEMRESATTRS_SERVICE_NAME]: "adot-integ-test",
        [SEMRESATTRS_CLOUD_PLATFORM]: "aws_ec2"
    }));
const _traceExporter = new OTLPTraceExporter();
const _spanProcessor = new BatchSpanProcessor(_traceExporter);
const _tracerConfig = {
    idGenerator: new AWSXRayIdGenerator(),
}



const PORT = parseInt(process.env.SAMPLE_APP_PORT || '8080', 10);

const app = express();

let tracerProvider;

function getSampledSpanCount(name, totalSpans, attributes) {
  const tracer = tracerProvider.getTracer(name);
	let sampleCount = 0;

	// totalSamples, err = strconv.Atoi(totalSpans)
  let totalSamples = Number(totalSpans);
	// if err != nil {
	// 	return 0, err
	// }

	let ctx = context.active();

  for (let i = 0; i < totalSamples; i += 1) {
		// _, span = tracer.Start(ctx, name, oteltrace.WithSpanKind(oteltrace.SpanKindServer), oteltrace.WithAttributes(attributes...))
    let span = tracer.startSpan(name, {attributes: attributes, kind: SpanKind.SERVER}, ctx);

    if (span.spanContext().traceFlags & TraceFlags.SAMPLED) {
      sampleCount += 1;
    }
    span.end();
	}

	return sampleCount
}


app.all('/getSampled', (req, res) => {
  let userAttribute = req.headers["user"]
  let required = req.headers["required"]
  let serviceName = req.headers["service_name"]
  let totalSpans = req.headers["totalspans"]

  var attributes = {
    ["http.method"]: req.method,
    ["http.url"]: "http://localhost:8080/getSampled",
    ["user"]: userAttribute,
    ["http.route"]: "/getSampled",
    ["required"]: required,
    ["http.target"]: "/getSampled",
  }

  let totalSampled = getSampledSpanCount(serviceName, totalSpans, attributes) + ''
  // if err != nil {
  //   log.Println(err)
  // }

  res.send(totalSampled)

  // _, err = w.Write([]byte(strconv.Itoa(totalSampled)))
  // if err != nil {
  //   log.Println(err)
  // }
});

app.all('/importantEndpoint', (req, res) => {
  let userAttribute = req.headers["user"]
  let required = req.headers["required"]
  let serviceName = req.headers["service_name"]
  let totalSpans = req.headers["totalspans"]

  var attributes = {
    ["http.method"]: "GET",
    ["http.url"]: "http://localhost:8080/importantEndpoint",
    ["user"]: userAttribute,
    ["http.route"]: "/importantEndpoint",
    ["required"]: required,
    ["http.target"]: "/importantEndpoint",
  }
  // var attributes = []attribute.KeyValue{
  //   attribute.KeyValue{"http.method", attribute.StringValue("GET")},
  //   attribute.KeyValue{"http.url", attribute.StringValue("http://localhost:8080/importantEndpoint")},
  //   attribute.KeyValue{"user", attribute.StringValue(userAttribute)},
  //   attribute.KeyValue{"http.route", attribute.StringValue("/importantEndpoint")},
  //   attribute.KeyValue{"required", attribute.StringValue(required)},
  //   attribute.KeyValue{"http.target", attribute.StringValue("/importantEndpoint")},
  // }

  let totalSampled = getSampledSpanCount(serviceName, totalSpans, attributes) + ''
  // if err != nil {
  //   log.Println(err)
  // }

  res.send(totalSampled)
  // if err != nil {
  //   log.Println(err)
  // }
});

app.listen(PORT, async () => {
  await nodeSDKBuilder();
  console.log(`Listening for requests on http://localhost:${PORT}`);
});


async function nodeSDKBuilder() {
  const sdk = new opentelemetry.NodeSDK({
      textMapPropagator: new AWSXRayPropagator(),
      instrumentations: [
          new HttpInstrumentation(),
          new AwsInstrumentation({
              suppressInternalInstrumentation: true
          }),
      ],
      resource: _resource,
      spanProcessor: _spanProcessor,
      traceExporter: new ConsoleSpanExporter(),
      idGenerator: new AWSXRayIdGenerator(),
  });
  // sdk.configureTracerProvider(_tracerConfig, _spanProcessor);

  // this enables the API to record telemetry
  await sdk.start();

  var xraySampler = new AwsXRayRemoteSampler({resource: _resource, pollingInterval: 10});
  console.log(xraySampler.toString());

  tracerProvider = new NodeTracerProvider({
    resource: _resource,
    sampler: xraySampler,
    traceExporter: new ConsoleSpanExporter()
  });

  // gracefully shut down the SDK on process exit
  process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing and Metrics terminated'))
    .catch((error) => console.log('Error terminating tracing and metrics', error))
    .finally(() => process.exit(0));
  });
}

// function start_xray(): Error {
// 	let ctx = context.active();

// 	let exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
// 	if (exporterEndpoint == "") {
// 		exporterEndpoint = "localhost:4317"
// 	}

// 	console.log("Creating new OTLP trace exporter...")
// 	let traceExporter, err = otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure(), otlptracegrpc.WithEndpoint(exporterEndpoint), otlptracegrpc.WithDialOption(grpc.WithBlock()))
// 	if err != nil {
// 		log.Fatalf("Failed to create new OTLP trace exporter: %v", err)
// 		return err
// 	}

// 	idg = xray.NewIDGenerator()

// 	samplerEndpoint = os.Getenv("XRAY_ENDPOINT")
// 	if samplerEndpoint == "" {
// 		samplerEndpoint = "http://localhost:2000"
// 	}
// 	endpointUrl, err = url.Parse(samplerEndpoint)

// 	res, err = sampler.NewRemoteSampler(ctx, "adot-integ-test", "", sampler.WithEndpoint(*endpointUrl), sampler.WithSamplingRulesPollingInterval(10*time.Second))
// 	if err != nil {
// 		log.Fatalf("Failed to create new XRay Remote Sampler: %v", err)
// 		return err
// 	}

// 	// attach remote sampler to tracer provider
// 	tp = trace.NewTracerProvider(
// 		trace.WithSampler(res),
// 		trace.WithBatcher(traceExporter),
// 		trace.WithIDGenerator(idg),
// 	)

// 	otel.SetTracerProvider(tp)
// 	otel.SetTextMapPropagator(xray.Propagator{})

// 	return nil
// }
