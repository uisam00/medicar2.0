export class NewConsultationRequest {
    idAgenda: number;
    horario: any;
    constructor(idAgenda:number, horario:any){
        this.idAgenda = idAgenda;
        this.horario = horario;
    }
}
