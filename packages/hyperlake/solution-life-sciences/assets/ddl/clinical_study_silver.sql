CREATE TABLE silver.clinical_studies
USING DELTA
AS SELECT
  CAST(study_id AS STRING) AS study_id,
  CAST(protocol_id AS STRING) AS protocol_id,
  CAST(study_phase AS STRING) AS study_phase,
  CAST(study_status AS STRING) AS study_status,
  CAST(start_date AS DATE) AS start_date,
  CAST(completion_date AS DATE) AS completion_date
FROM bronze.clinical_studies;
