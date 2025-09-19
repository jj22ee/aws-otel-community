#
# Converts from OTel hex Trace ID to X-Ray formatted hex trace ID. This is valid
# as long as we are using the `OpenTelemetry::Propagator::XRay::IDGenerator`
# in the rails initializer file.
#
# See more: `sample-apps/manual-instrumentation/ruby-on-rails/config/initializers/opentelemetry.rb`
#
# See more: https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-tracingheader
#
# @param [String] otel_trace_id_hex An OTel Trace ID String in hex format.
#
# @return [Hash] An X-Ray Trace ID with the version, timestamp component, and
# unique identifier compnent, all separated by the `-` delimiter.
#
def convert_otel_trace_id_to_xray(otel_trace_id_hex)
  xray_trace_id = "1-#{otel_trace_id_hex[0..7]}-#{otel_trace_id_hex[8..otel_trace_id_hex.length]}"
  { traceId: xray_trace_id }
end

# class ApiController < ActionController::Base
# end

#
# ApplicationController - Simple class of routes used to test OpenTelemetry.
#
class ApplicationController < ActionController::Base
  protect_from_forgery with: :null_session

  def test
    Faraday.get('https://aws.amazon.com/')
    # puts "X-Ray Trace ID is: " + (convert_otel_trace_id_to_xray(OpenTelemetry::Trace.current_span.context.hex_trace_id))[:traceId]

    render html: (convert_otel_trace_id_to_xray(OpenTelemetry::Trace.current_span.context.hex_trace_id))[:traceId]
  end

  def get_sampled_span_count(name, total_spans, attributes)
    start = Time.now
    # puts name
    # puts total_spans
    tracer = OpenTelemetry.tracer_provider.tracer(name)
    sampled_count = 0
    total_spans.to_i.times do
      tracer.in_span('Root Span', attributes: attributes, kind: :server) do |span|
        # puts span.context.trace_flags.sampled?
        sampled_count += 1 if span.context.trace_flags.sampled?
      end
    end
    ends = Time.now
    puts "timeDiff: #{ends - start}"
    sampled_count
  end

  def important_endpoint
    span_attributes = {
      'http.request.method' => 'GET',
      'url.full' => 'http://localhost:8080/importantEndpoint',
      'user' => request.headers['user'],
      'http.route' => '/importantEndpoint',
      'required' => request.headers['required'],
      'url.path' => '/importantEndpoint'
    }

    count = get_sampled_span_count(
      request.headers['servicename'],
      request.headers['totalspans'],
      span_attributes
    )

    render plain: count.to_s
  end

  def get_sampled
    span_attributes = {
      'http.request.method' => request.method,
      'url.full' => 'http://localhost:8080/getSampled',
      'user' => request.headers['user'],
      'http.route' => '/getSampled',
      'required' => request.headers['required'],
      'url.path' => '/getSampled'
    }
    # puts ".......>"
    # puts request.headers
    count = get_sampled_span_count(
      request.headers['servicename'],
      request.headers['totalspans'],
      span_attributes
    )

    render plain: count.to_s
  end
end
