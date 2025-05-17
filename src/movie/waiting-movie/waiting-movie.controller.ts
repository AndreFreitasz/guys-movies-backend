import { Controller, Get, Param } from '@nestjs/common';
import { WaitingMovieService } from './waiting-movie.service';

@Controller('waitingMovie')
export class WaitingMovieController {
  constructor(private readonly WaitingMovieService: WaitingMovieService) {}
  
}
