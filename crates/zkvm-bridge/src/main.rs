//! Bounded JSON-lines worker for the local TypeScript SDK. Never talks to an API.
use serde::Deserialize;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use zkvm_bridge::{Envelope, NativeSimulatorBackend, ProveRequest, ZkVmBackend, MAX_WIRE_BYTES};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    request_id: u32,
    op: String,
    payload: Value,
}

fn process(request: &Request) -> Result<Value, String> {
    let backend = NativeSimulatorBackend;
    match request.op.as_str() {
        "image_id" => Ok(json!(backend.image_id()?)),
        "prove" => {
            let input: ProveRequest =
                serde_json::from_value(request.payload.clone()).map_err(|_| "INVALID_INPUT")?;
            serde_json::to_value(backend.prove(&input)?).map_err(|e| e.to_string())
        }
        "verify" => {
            let envelope: Envelope =
                serde_json::from_value(request.payload.clone()).map_err(|_| "INVALID_ENVELOPE")?;
            backend.verify(&envelope)?;
            Ok(json!(true))
        }
        _ => Err("UNKNOWN_OPERATION".into()),
    }
}

fn main() -> io::Result<()> {
    let stdin = io::stdin();
    let mut reader = stdin.lock();
    let mut out = io::BufWriter::new(io::stdout().lock());
    loop {
        // take() prevents unbounded allocation even without a newline.
        let mut line = String::new();
        let count =
            std::io::Read::take(&mut reader, (MAX_WIRE_BYTES + 1) as u64).read_line(&mut line)?;
        if count == 0 {
            break;
        }
        if count > MAX_WIRE_BYTES {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "request too large",
            ));
        }
        let response = match serde_json::from_str::<Request>(&line) {
            Ok(request) => match process(&request) {
                Ok(result) => json!({"request_id":request.request_id,"ok":true,"result":result}),
                Err(error) => json!({"request_id":request.request_id,"ok":false,"error":error}),
            },
            Err(_) => json!({"request_id":null,"ok":false,"error":"INVALID_JSON"}),
        };
        writeln!(out, "{response}")?;
        out.flush()?;
    }
    Ok(())
}
