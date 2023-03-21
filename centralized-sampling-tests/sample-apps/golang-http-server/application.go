package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
	"net/url"

	"go.opentelemetry.io/contrib/propagators/aws/xray"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	// "go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/sdk/trace"
	oteltrace "go.opentelemetry.io/otel/trace"
	sample "go.opentelemetry.io/contrib/samplers/aws/xray"

	"google.golang.org/grpc"
)


func getSampledSpanCount(name string, totalSpans string, attributes[] attribute.KeyValue) int {
	tracer := otel.Tracer(name)

	var count = 0
	totalSamples, _ := strconv.Atoi(totalSpans)
	log.Println("totalSamples - " + strconv.Itoa(totalSamples) + "(" + totalSpans + ")")

	for i := 0; i < totalSamples; i++ {
		_, span := tracer.Start(context.Background(), name, oteltrace.WithSpanKind(oteltrace.SpanKindServer), oteltrace.WithAttributes(attributes...))
		
		if span.SpanContext().IsSampled() {
			count = count + 1;
		}

		span.End()
	}

	return count
}

func webServer() {
	http.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("healthcheck"))
	}))

	//test http instrumentation
	http.Handle("/getSampled", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {


		userAttribute := r.Header["User"][0]
		required := r.Header["Required"][0]

		// log.Println(r)
		// log.Println("1. " + r.Header["User"][0])
		// log.Println("2. " + r.Header["Required"][0])
		// log.Println("3. " + r.Header["Service_name"])
		// log.Println("4. " + r.Header["TotalSpans"][0])

		aa := attribute.KeyValue{"http.method", attribute.StringValue("GET")}
		bb := attribute.KeyValue{"http.url", attribute.StringValue("http://localhost:8080/getSampled")}
		cc := attribute.KeyValue{"user", attribute.StringValue(userAttribute)}
		dd := attribute.KeyValue{"http.route", attribute.StringValue("/getSampled")}
		ee := attribute.KeyValue{"required", attribute.StringValue(required)}
		ff := attribute.KeyValue{"http.target", attribute.StringValue("/getSampled")}
		// var attributes = []attribute.KeyValue{
		// 	{Key: "http.method", Value: "POST"},
        //     {Key: "http.url", Value: "http://localhost:8080/getSampled"},
        //     {Key: "user", Value: "userAttribute"},
        //     {Key: "http.route", Value: "/getSampled"},
        //     {Key: "required", Value: "required"},
        //     {Key: "http.target", Value: "/getSampled"},
		// }
		
        if r.Method == "GET" {
        } else if r.Method == "POST" {
			aa = attribute.KeyValue{"http.method", attribute.StringValue("POST")}
        } else {
			
        }

		var attributes = []attribute.KeyValue{aa,bb,cc,dd,ee,ff}

		// start_xray(r.Header["Service_name"][0])

		var x = getSampledSpanCount(r.Header["Service_name"][0], r.Header["Totalspans"][0], attributes);

		if x == 1 {
			x = 0
		}

		// _, err := ctxhttp.Get(r.Context(), xray.Client(nil), "https://aws.amazon.com")
		// if err != nil {
		// 	log.Println(err)
		// 	return
		// }
		// _, _ = w.Write([]byte(strconv.Itoa(x)))

		_, _ = w.Write([]byte(strconv.Itoa(x)))
	}))

	http.Handle("/importantEndpoint", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// testAWSCalls(r.Context())
		// _, _ = w.Write([]byte("importantEndpoint!"))

		userAttribute := r.Header["User"][0]
		required := r.Header["Required"][0]

		log.Println(r)

		aa := attribute.KeyValue{"http.method", attribute.StringValue("GET")}
		bb := attribute.KeyValue{"http.url", attribute.StringValue("http://localhost:8080/importantEndpoint")}
		cc := attribute.KeyValue{"user", attribute.StringValue(userAttribute)}
		dd := attribute.KeyValue{"http.route", attribute.StringValue("/importantEndpoint")}
		ee := attribute.KeyValue{"required", attribute.StringValue(required)}
		ff := attribute.KeyValue{"http.target", attribute.StringValue("/importantEndpoint")}

		var attributes = []attribute.KeyValue{aa,bb,cc,dd,ee,ff}

		// start_xray(r.Header["Service_name"][0])

		var x = getSampledSpanCount(r.Header["Service_name"][0], r.Header["Totalspans"][0], attributes);

		if x == 1 {
			x = 0
		}

		_, _ = w.Write([]byte(strconv.Itoa(x)))
	}))

	//test aws sdk instrumentation
	http.Handle("/aws-sdk-call", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// testAWSCalls(r.Context())
		// _, _ = w.Write([]byte("Tracing aws sdk call!"))

		_, _ = w.Write([]byte(strconv.Itoa(3)))
	}))

	listenAddress := os.Getenv("LISTEN_ADDRESS")
	if listenAddress == "" {
		listenAddress = "0.0.0.0:8080"
	}
	log.Println("App is listening on %s !", listenAddress)
	_ = http.ListenAndServe(listenAddress, nil)
}

// func testAWSCalls(ctx context.Context) {
// 	awsSess := session.Must(session.NewSession(&aws.Config{
// 		Region: aws.String("us-west-2")},))

// 	s3Client := s3.New(awsSess)
// 	xray.AWS(s3Client.Client)
// 	if _, err := s3Client.ListBucketsWithContext(ctx, nil); err != nil {
// 		log.Println(err)
// 		return
// 	}
// 	log.Println("Successfully traced aws sdk call")
// }

func start_xray(servername string) {
	ctx := context.Background()
	// Create and start new OTLP trace exporter
	traceExporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithInsecure(), otlptracegrpc.WithEndpoint("0.0.0.0:4317"), otlptracegrpc.WithDialOption(grpc.WithBlock()))
	if err != nil {
		log.Fatalf("failed to create new OTLP trace exporter: %v", err)
	}

	idg := xray.NewIDGenerator()

	log.Println("1...")

	endpoint, err := url.Parse("http://127.0.0.1:2000"); if err != nil {
		  return
	}
	// instantiate remote sampler with options
	rs, err := sample.NewRemoteSampler(ctx, "*", "*", sample.WithEndpoint(*endpoint), sample.WithSamplingRulesPollingInterval(2 * time.Second)); if err != nil {
		  return
	}
	// attach remote sampler to tracer provider
	tp := trace.NewTracerProvider(
		trace.WithSampler(rs),
		trace.WithBatcher(traceExporter),
		trace.WithIDGenerator(idg),
	)

	log.Println("2...")

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(xray.Propagator{})

}

func main() {
	
	log.Println("main()")

	start_xray("start_service")

	log.Println("3... webServer()")
	webServer()
}
