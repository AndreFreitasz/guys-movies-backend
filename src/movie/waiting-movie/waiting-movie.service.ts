import { Injectable } from "@nestjs/common";

@Injectable()
export class WaitingMovieService {
  async getWaitingMovie(idTmdb: number, idUser: number) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return { message: "Waiting movie data" };
  }
}