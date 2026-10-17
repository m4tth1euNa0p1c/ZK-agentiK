use anyhow::{ensure, Context, Result};
use lab_verifier::{
    authorize_historical, import_receipt, reject_dev_environment, MAX_BUNDLE_BYTES,
};
use policy_statement::PublicInputs;
use std::{fs::File, io::Read};

fn bounded_read(path: &str, max: usize) -> Result<Vec<u8>> {
    let mut bytes = Vec::new();
    File::open(path)?
        .take((max + 1) as u64)
        .read_to_end(&mut bytes)?;
    ensure!(bytes.len() <= max, "INPUT_TOO_LARGE");
    Ok(bytes)
}

fn main() -> Result<()> {
    reject_dev_environment()?;
    let args: Vec<String> = std::env::args().collect();
    ensure!(
        args.len() == 3,
        "usage: lab-verifier proof.json expected-public-inputs.json"
    );
    let receipt = import_receipt(&bounded_read(&args[1], MAX_BUNDLE_BYTES)?)?;
    let expected: PublicInputs = serde_json::from_slice(&bounded_read(&args[2], 16_384)?)?;
    authorize_historical(&receipt, &expected).context("VERIFICATION_REJECTED")?;
    println!("VERIFIED: real succinct receipt, pinned guest, signed fixture, matching historical challenge; no dispatch");
    Ok(())
}
