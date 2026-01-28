type DoctorStatus = 'ok' | 'warn' | 'fail'

interface DoctorResult {
    name: string
    status: DoctorStatus
    details: string[]
    fix?: string
}

export { DoctorResult, DoctorStatus }
